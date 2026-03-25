const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const connectDb = require("./db/db");
const model = require("./lib/model");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { UploadFile } = require("./services/storage.service");
const emailValidator = require("deep-email-validator");
const nodemailer = require("nodemailer");

const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for OTPs: Map<email, { otp: string, expiresAt: number, verified: boolean }>
const otpStore = new Map();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

connectDb();
const app = express();
app.use(express.json());

// Allow the Next.js frontend (or any origin in dev) to call this API
// In dev we keep this wide open to avoid pesky CORS "Failed to fetch" errors.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);

// ============================
// Email / Password Auth APIs
// ============================

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check if email was verified via OTP
    const otpData = otpStore.get(email);
    if (!otpData || !otpData.verified) {
      return res.status(401).json({ message: "Email not verified. Please verify your email first." });
    }

    const existing = await model.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await model.create({
      email,
      passwordHash,
      displayName: name,
    });

    // Clear OTP data after successful registration
    otpStore.delete(email);

    return res.status(201).json({
      message: "Registered successfully",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
      isProfileCompleted: user.isProfileCompleted,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
});

// Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // 1. Check if user already exists
    const existing = await model.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 2. Deep validate email format & domain
    const { valid, reason, validators } = await emailValidator.validate({
      email: email,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false // often causes timeouts or gets blocked, so we leave it false
    });

    // If it's completely invalid (like bad domain)
    if (!valid && validators[reason]?.reason) {
      return res.status(400).json({ 
        message: "Invalid email address or domain does not exist.",
        reason: validators[reason].reason 
      });
    }

    // 3. Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, { otp, expiresAt, verified: false });

    // 4. Send email
    const mailOptions = {
      from: `"StrangerChat" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your StrangerChat Verification Code",
      text: `Your verification code is: ${otp}\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-w: 400px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #2563eb; margin-top: 0;">StrangerChat</h2>
          <p>Please use the following verification code to complete your registration:</p>
          <h1 style="letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center;">${otp}</h1>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">This code will expire in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ message: "Failed to send verification code." });
  }
});

// Verify OTP
app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const otpData = otpStore.get(email);
    if (!otpData) {
      return res.status(400).json({ message: "No pending verification for this email. Please request a new code." });
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Success
    otpStore.set(email, { ...otpData, verified: true });
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await model.findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
      },
      isProfileCompleted: user.isProfileCompleted,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

app.post("/form", async (req, res) => {
  try {
    const {
      userId,
      fullName,
      displayName,
      bio,
      gender,
      dateOfBirth,
      country,
      state,
      city,
      languages,
      interests,
      preferredGender,
      preferredAgeRange,
      preferredLanguage,
      regionPreference,
      chatMode,
      anonymousMode,
      allowFriendRequests,
    } = req.body;

    let parsedDateOfBirth = undefined;
    if (dateOfBirth) {
      const d = new Date(dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        parsedDateOfBirth = d;
      }
    }

    const profileData = {
      fullName,
      displayName,
      bio,
      gender,
      dateOfBirth: parsedDateOfBirth,
      country,
      state,
      city,
      languages,
      interests,
      preferredGender,
      preferredAgeRange,
      preferredLanguage,
      regionPreference,
      chatMode,
      anonymousMode,
      allowFriendRequests,
    };

    let userDoc;

    if (userId) {
      userDoc = await model.findByIdAndUpdate(
        userId,
        { $set: { ...profileData, isProfileCompleted: true } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      userDoc = await model.create({ ...profileData, isProfileCompleted: true });
    }

    res.status(201).json({
      message: "Form submitted successfully",
      id: userDoc._id,
      user: userDoc,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate key error (likely email index)",
        error: err.keyValue,
      });
    }

    console.error("Error saving form:", err);
    res.status(500).json({ message: "Failed to submit form" });
  }
});

// ============================
// User profile APIs
// ============================

// Find users by displayName (used as username) with partial, case-insensitive match
app.get("/users/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const regex = new RegExp(q.trim(), "i");
    const { requesterId } = req.query;

    const users = await model
      .find({ displayName: { $regex: regex } })
      .select("displayName profilePicture bio country friendRequests friends")
      .limit(10)
      .lean();

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const processedUsers = users.map((u) => {
      const isFriend = u.friends?.some((f) => f.toString() === requesterId);
      const isRequested = u.friendRequests?.some(
        (r) => r.from.toString() === requesterId && r.status === "pending"
      );
      return {
        _id: u._id,
        displayName: u.displayName,
        profilePicture: u.profilePicture,
        bio: u.bio,
        country: u.country,
        isFriend,
        isRequested,
      };
    });

    res.status(200).json({ users: processedUsers });
  } catch (err) {
    console.error("Error searching users by username:", err);
    res.status(500).json({ message: "Failed to search users" });
  }
});

// Send friend request
app.post("/users/:id/friend-requests", async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterId } = req.body;

    if (!requesterId) {
      return res.status(400).json({ message: "Requester ID is required" });
    }

    if (id === requesterId) {
      return res.status(400).json({ message: "Cannot friend yourself" });
    }

    const targetUser = await model.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already requested
    const alreadyRequested = targetUser.friendRequests.some(
      (r) => r.from.toString() === requesterId && r.status === "pending"
    );
    if (alreadyRequested) {
      return res.status(400).json({ message: "Request already pending" });
    }

    // Check if already friends
    const alreadyFriends = targetUser.friends.some(
      (f) => f.toString() === requesterId
    );
    if (alreadyFriends) {
      return res.status(400).json({ message: "Already friends" });
    }

    targetUser.friendRequests.push({ from: requesterId, status: "pending" });
    await targetUser.save();

    res.status(201).json({ message: "Friend request sent" });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({ message: "Failed to send friend request" });
  }
});

// Get incoming friend requests
app.get("/users/:id/friend-requests", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await model.findById(id)
      .populate("friendRequests.from", "displayName profilePicture")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pendingRequests = user.friendRequests.filter(r => r.status === "pending");

    res.status(200).json({ requests: pendingRequests });
  } catch (err) {
    console.error("Error fetching friend requests:", err);
    res.status(500).json({ message: "Failed to fetch friend requests" });
  }
});

// Update friend request (Accept/Reject)
app.put("/users/:id/friend-requests/:requestId", async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await model.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const request = user.friendRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = status;

    if (status === "accepted") {
      const requesterId = request.from;

      // Add to each other's friends list
      if (!user.friends.includes(requesterId)) {
        user.friends.push(requesterId);
      }

      await model.findByIdAndUpdate(requesterId, {
        $addToSet: { friends: id }
      });
    }

    await user.save();
    res.status(200).json({ message: `Request ${status}` });
  } catch (err) {
    console.error("Error updating friend request:", err);
    res.status(500).json({ message: "Failed to update friend request" });
  }
});

// Get current user by id
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterId } = req.query;

    const user = await model
      .findById(id)
      .select("-passwordHash")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = id === requesterId;
    const isFriend = user.friends?.some((f) => f.toString() === requesterId);

    if (!isSelf && !isFriend) {
      // Return restricted profile
      return res.status(200).json({
        user: {
          _id: user._id,
          displayName: user.displayName,
          profilePicture: user.profilePicture,
          isPrivate: true,
        },
      });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("Error fetching user by id:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Update profile (partial)
app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const allowedFields = [
      "fullName",
      "displayName",
      "bio",
      "gender",
      "dateOfBirth",
      "country",
      "state",
      "city",
      "languages",
      "interests",
      "preferredGender",
      "preferredAgeRange",
      "preferredLanguage",
      "regionPreference",
      "chatMode",
      "anonymousMode",
      "allowFriendRequests",
      "email",
    ];

    const update = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    if (update.dateOfBirth) {
      const d = new Date(update.dateOfBirth);
      if (!Number.isNaN(d.getTime())) {
        update.dateOfBirth = d;
      } else {
        delete update.dateOfBirth;
      }
    }

    const user = await model
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Delete user
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await model.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.post("/profile-img/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "image file is required" });
    }

    const profilePictureUrl = await UploadFile(
      req.file.buffer,
      req.file.originalname || "profile-picture.jpg"
    );

    const updated = await model.findByIdAndUpdate(
      id,
      { profilePicture: profilePictureUrl },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile image updated",
      profilePicture: profilePictureUrl,
      user: updated,
    });
  } catch (err) {
    console.error("Error uploading profile image:", err);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});