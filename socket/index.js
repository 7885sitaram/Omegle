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
    displayName: { type: String, trim: true },
    interests: [{ type: String, trim: true }],
    isBanned: { type: Boolean, default: false },
    trustScore: { type: Number, default: 0 },
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

  const isProfileCompleted = !!(user.displayName && user.interests?.length > 0)

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
      isProfileCompleted,
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

const waiting = [] // Stores { id: socket.id, interests: [] }
const activePair = new Map()

const phoneWaitingQueue = []
const phoneActivePairs = new Map()
const callTimeouts = new Map()

const synonyms = {
  coding: ["programming", "development", "software", "tech", "react", "nextjs", "javascript"],
  cricket: ["sports", "ipl", "batting", "bowling", "world cup"],
  music: ["singing", "guitar", "piano", "songs", "pop", "rock", "classical"],
  gaming: ["pubg", "freefire", "valorant", "pc gaming", "esports", "ps5", "xbox"],
  dance: ["hiphop", "classical", "dancing", "ballet"],
  movie: ["netflix", "cinema", "films", "hollywood", "bollywood", "anime"],
  travel: ["tourism", "hiking", "vlog", "mountains", "beach"],
  reading: ["books", "novels", "literature", "poetry"],
}

function isSimilar(a, b) {
  const normalizedA = a.toLowerCase().trim()
  const normalizedB = b.toLowerCase().trim()
  if (normalizedA === normalizedB) return true
  return (
    synonyms[normalizedA]?.includes(normalizedB) ||
    synonyms[normalizedB]?.includes(normalizedA)
  )
}

function calculateMatchScore(interests1, interests2) {
  if (!interests1?.length || !interests2?.length) return 0
  let score = 0
  for (const i1 of interests1) {
    for (const i2 of interests2) {
      if (isSimilar(i1, i2)) {
        score += 1
      }
    }
  }
  return score
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id)

  if (waiting.includes(socket.id)) return

  socket.on("start", (data = {}) => {
    const interests = data.interests || []
    console.log(`Socket ${socket.id} starting with interests:`, interests)

    if (waiting.length > 0) {
      // Find best match in waiting list
      let bestMatchIdx = -1
      let highestScore = -1

      for (let i = 0; i < waiting.length; i++) {
        const score = calculateMatchScore(interests, waiting[i].interests)
        if (score > highestScore) {
          highestScore = score
          bestMatchIdx = i
        }
      }

      // If we found someone (even with 0 score, it picks the first one)
      const partnerObj = waiting.splice(bestMatchIdx, 1)[0]
      const partner = partnerObj.id
      const partnerId = partnerObj.userId
      const roomId = uuid()

      activePair.set(socket.id, { 
        partnerId: partner, 
        partnerUserId: partnerId, 
        partnerName: partnerObj.displayName,
        ownUserId: data.userId, 
        ownName: data.displayName 
      })
      activePair.set(partner, { 
        partnerId: socket.id, 
        partnerUserId: data.userId, 
        partnerName: data.displayName,
        ownUserId: partnerId, 
        ownName: partnerObj.displayName 
      })

      socket.emit("matched", { roomId, partnerId: partnerId, partnerName: partnerObj.displayName })
      io.to(partner).emit("matched", { roomId, partnerId: data.userId, partnerName: data.displayName })
      console.log(`Matched ${socket.id} (${data.displayName}) with ${partner} (${partnerObj.displayName}) (Score: ${highestScore})`)
    } else {
      waiting.push({ id: socket.id, userId: data.userId, interests, displayName: data.displayName })
      socket.emit("waiting")
      console.log(`Socket ${socket.id} (${data.displayName}) added to waiting list`)
    }

    socket.on("message", (msg) => {
      const session = activePair.get(socket.id)
      if (session) {
        io.to(session.partnerId).emit("message", { msg, from: socket.id })
      }
    })

    socket.on("typing", () => {
      const session = activePair.get(socket.id)
      if (session) {
        io.to(session.partnerId).emit("typing")
      }
    })

    socket.on("stop_typing", () => {
      const session = activePair.get(socket.id)
      if (session) {
        io.to(session.partnerId).emit("stop_typing")
      }
    })

    socket.on("next", () => {
      handleLeave(socket.id)
    })

    socket.on("match_confirmed", () => {
      const session = activePair.get(socket.id)
      if (session) {
        io.to(session.partnerId).emit("match_confirmed")
      }

      const pSession = phoneActivePairs.get(socket.id)
      if (pSession) {
        io.to(pSession.partnerId).emit("match_confirmed")
      }
    })

    socket.on("disconnect", () => {
      handleLeave(socket.id)
    })
  })

  // --------------- PRIVATE MESSAGING LOGIC ---------------
  const userSockets = new Map() // userId -> socket.id

  // --------------- PHONE MODE LOGIC ---------------
  socket.on("start_phone_mode", (data = {}) => {
    const { userId, mobileNumber } = data;
    if (phoneWaitingQueue.find(w => w.id === socket.id)) return;
    
    console.log(`Socket ${socket.id} started phone mode with mobile: ${mobileNumber}`);
    
    if (phoneWaitingQueue.length > 0) {
      const partnerObj = phoneWaitingQueue.shift();
      const partnerId = partnerObj.id;
      const roomId = uuid();
      
      phoneActivePairs.set(socket.id, { partnerId, partnerUserId: partnerObj.userId, roomId, status: 'calling', accepted: false });
      phoneActivePairs.set(partnerId, { partnerId: socket.id, partnerUserId: userId, roomId, status: 'calling', accepted: false });
      
      socket.emit("incoming_call", { partnerMobile: partnerObj.mobileNumber, partnerId: partnerObj.userId, roomId });
      io.to(partnerId).emit("incoming_call", { partnerMobile: mobileNumber, partnerId: userId, roomId });
      
      const t = setTimeout(() => {
        if (phoneActivePairs.has(socket.id) && phoneActivePairs.get(socket.id).status === 'calling') {
          io.to(socket.id).emit("call_cancelled", { reason: 'timeout' });
          io.to(partnerId).emit("call_cancelled", { reason: 'timeout' });
          phoneActivePairs.delete(socket.id);
          phoneActivePairs.delete(partnerId);
        }
      }, 15000);
      callTimeouts.set(roomId, t);
    } else {
      phoneWaitingQueue.push({ id: socket.id, userId, mobileNumber });
      socket.emit("searching_phone");
      console.log(`Socket ${socket.id} added to phone waiting queue`);
    }
  });

  socket.on("accept_call", () => {
    const session = phoneActivePairs.get(socket.id);
    if (!session || session.status !== 'calling') return;
    session.accepted = true;
    
    const partnerSession = phoneActivePairs.get(session.partnerId);
    if (partnerSession && partnerSession.accepted) {
      const roomId = session.roomId;
      clearTimeout(callTimeouts.get(roomId));
      callTimeouts.delete(roomId);
      session.status = 'in-call';
      partnerSession.status = 'in-call';
      socket.emit("call_connected", { roomId });
      io.to(session.partnerId).emit("call_connected", { roomId });
      console.log(`Call connected in room ${roomId}`);
    }
  });

  socket.on("reject_call", () => {
    const session = phoneActivePairs.get(socket.id);
    if (!session) return;
    const { partnerId, roomId } = session;
    clearTimeout(callTimeouts.get(roomId));
    callTimeouts.delete(roomId);
    
    io.to(partnerId).emit("call_cancelled", { reason: 'rejected' });
    socket.emit("call_cancelled", { reason: 'rejected' });
    
    phoneActivePairs.delete(socket.id);
    phoneActivePairs.delete(partnerId);
    console.log(`Call rejected in room ${roomId}`);
  });
  
  socket.on("end_phone_call", () => {
    const session = phoneActivePairs.get(socket.id);
    if (!session) return;
    const { partnerId, partnerUserId } = session;
    io.to(partnerId).emit("call_ended", { partnerId: partnerUserId });
    socket.emit("call_ended", { partnerId: session.partnerUserId });
    phoneActivePairs.delete(socket.id);
    phoneActivePairs.delete(partnerId);
  });
  // -------------------------------------------------------

  socket.on("register_user", (userId) => {
    if (userId) {
      userSockets.set(userId, socket.id)
      console.log(`User ${userId} registered with socket ${socket.id}`)
    }
  })

  socket.on("send_private_message", (data) => {
    // data: { sender: userId, receiver: targetUserId, content: text, sharedPost: obj, createdAt: date }
    console.log("Private message received:", data.content, "to:", data.receiver)
    const receiverSocketId = userSockets.get(data.receiver)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receive_private_message", data)
      console.log("Private message delivered via socket")
    }
  })
  
  socket.on("friend_request", (data) => {
    // data: { senderId, targetId, senderName }
    console.log(`Friend request from ${data.senderName} to ${data.targetId}`)
    const targetSocketId = userSockets.get(data.targetId)
    if (targetSocketId) {
      io.to(targetSocketId).emit("friend_request_received", {
        senderId: data.senderId,
        senderName: data.senderName
      })
    }
  })
  // -------------------------------------------------------

  function handleLeave(id) {
    const idx = waiting.findIndex((w) => w.id === id)
    if (idx !== -1) {
      waiting.splice(idx, 1)
      return
    }

    const session = activePair.get(id)
    if (session) {
      io.to(session.partnerId).emit("partner_left", { 
        partnerId: session.ownUserId, // Send LEAVER'S userId
        partnerName: session.ownName      // Send LEAVER'S name
      })
      activePair.delete(id)
      activePair.delete(session.partnerId)
    }
    
    // Phone Mode Cleanup
    const pIdx = phoneWaitingQueue.findIndex((w) => w.id === id);
    if (pIdx !== -1) {
      phoneWaitingQueue.splice(pIdx, 1);
    }
    const pSession = phoneActivePairs.get(id);
    if (pSession) {
      io.to(pSession.partnerId).emit("call_cancelled", { reason: 'partner_left' });
      const roomId = pSession.roomId;
      clearTimeout(callTimeouts.get(roomId));
      callTimeouts.delete(roomId);
      phoneActivePairs.delete(id);
      phoneActivePairs.delete(pSession.partnerId);
    }
    
    // Also remove from userSockets if they disconnect
    for (const [userId, sId] of userSockets.entries()) {
      if (sId === id) {
        userSockets.delete(userId)
        break
      }
    }
  }
})

const port = process.env.PORT || 4001
server.listen(port, () => {
  console.log("Server running on", port)
})