import http from "http"
import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { Server } from "socket.io"
import { v4 as uuid } from "uuid"

dotenv.config()

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
})

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

const MONGO_URI = process.env.MONGO_URI
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"

if (!MONGO_URI) {
  console.warn("⚠️ MONGO_URI not set in .env. MongoDB connection will fail.")
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message))

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
)

const User = mongoose.models.User || mongoose.model("User", userSchema)

function generateToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  )
}

function sendAuthResponse(res, user) {
  const token = generateToken(user)
  const safeUser = {
    id: user._id,
    email: user.email,
    name: user.name,
  }

  res
    .cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .status(200)
    .json({
      user: safeUser,
      token,
    })
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ message: "Email already registered" })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, passwordHash })

    // Auto login after register
    sendAuthResponse(res, user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Something went wrong" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    sendAuthResponse(res, user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Something went wrong" })
  }
})

app.get("/api/auth/me", async (req, res) => {
  try {
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1])

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.sub).select("-passwordHash")
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    res.json({ user })
  } catch (err) {
    console.error(err)
    res.status(401).json({ message: "Invalid or expired token" })
  }
})

const waiting = []
const activePair = new Map()

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id)

  if (waiting.includes(socket.id)) return

  socket.on("start", () => {
    if (waiting.length > 0) {
      const partner = waiting.shift()
      const roomId = uuid()

      activePair.set(socket.id, partner)
      activePair.set(partner, socket.id)

      socket.emit("matched", { roomId })
      socket.to(partner).emit("matched", { roomId })
    } else {
      waiting.push(socket.id)
      socket.emit("waiting")
    }

    socket.on("message", (msg) => {
      const partner = activePair.get(socket.id)
      if (partner) {
        io.to(partner).emit("message", { msg, from: socket.id })
      }
    })

    socket.on("next", () => {
      handleLeave(socket.id)
    })

    socket.on("disconnect", () => {
      handleLeave(socket.id)
    })
  })

  function handleLeave(id) {
    const idx = waiting.indexOf(id)
    if (idx !== -1) {
      waiting.splice(idx, 1)
      return
    }

    const partner = activePair.get(id)
    if (partner) {
      io.to(partner).emit("partner_left")
      activePair.delete(id)
      activePair.delete(partner)
    }
  }
})

const port = process.env.PORT || 5000
server.listen(port, () => {
  console.log("Server running on", port)
})