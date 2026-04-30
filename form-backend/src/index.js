const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const connectDb = require("./db/db");
const model = require("./lib/model");
const Post = require("./lib/post");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { UploadFile } = require("./services/storage.service");
const emailValidator = require("deep-email-validator");
const nodemailer = require("nodemailer");
const axios = require("axios");
const mongoose = require("mongoose");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { exec } = require("child_process");
const { parsePhoneNumber } = require("libphonenumber-js");

// In-memory store for OTPs: Map<email, { otp: string, expiresAt: number, verified: boolean }>
const otpStore = new Map();
const mobileOtpStore = new Map(); // Map<mobileNumber, { otp: string, expiresAt: number }>

// --- Multer Setup ---
const upload = multer({ storage: multer.memoryStorage() });

// Auto-start Ollama locally
function startOllama() {
  exec("ollama serve", (error, stdout, stderr) => {
    if (error) {
      if (!error.message.includes("address already in use") && !error.message.includes("normally permitted")) {
        // Silent fail for auto-start to avoid blocking logs
      }
    } else {
      console.log("Ollama local AI active.");
    }
  });
}
startOllama();

// Nodemailer transporter initialization
let transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn("WARNING: SMTP_USER or SMTP_PASS not set. Email verification will not work.");
}

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
    console.log(`Received send-otp request for email: ${req.body.email}`);
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // 1. Check if user already exists
    console.log(`Checking if user exists: ${email}`);
    const existing = await model.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // 2. Deep validate email format & domain
    console.log(`Validating email: ${email}`);
    const { valid, reason, validators } = await emailValidator.validate({
      email: email,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false
    });
    console.log(`Email validation result: valid=${valid}, reason=${reason}`);

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

    console.log(`Generated OTP for ${email}: ${otp}`);
    otpStore.set(email, { otp, expiresAt, verified: false });

    // 4. Send email
    if (!transporter) {
      console.error("Transporter not initialized. Check SMTP_USER and SMTP_PASS.");
      return res.status(500).json({ message: "Email service not configured. Please contact support." });
    }

    console.log(`Sending email to ${email} using ${process.env.SMTP_USER}`);
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
    console.log(`Email sent successfully to ${email}`);

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

// Send Profile Verification OTP via Email
app.post("/api/auth/send-mobile-otp", async (req, res) => {
  try {
    console.log("[VERIFY-REQ] Body:", req.body);
    const { userId, mobileNumber } = req.body;
    if (!userId || !mobileNumber) {
      console.warn(`[VERIFY-REQ] Missing fields: userId=${userId}, mobileNumber=${mobileNumber}`);
      return res.status(400).json({ message: "userId and mobileNumber are required" });
    }

    // 1. Get user email
    console.log(`[VERIFY] Looking up user by ID: ${userId} for mobile: ${mobileNumber}`);
    const user = await model.findById(userId);
    if (!user) {
      console.warn(`[VERIFY] User not found for ID: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }
    const email = user.email;
    console.log(`[VERIFY] User found: ${user.displayName}, Email: ${email}`);
    if (!email) {
      return res.status(400).json({ message: "User has no registered email. Verification impossible." });
    }

    // 2. Mobile validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(mobileNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    // 3. Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    mobileOtpStore.set(mobileNumber, { otp, expiresAt });

    // 4. Send Email via Nodemailer
    const mailOptions = {
      from: `"StrangerChat" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "StrangerChat Profile Verification Code",
      text: `Your profile verification code is: ${otp}\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-w: 450px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
          <h2 style="color: #2563eb; margin-top: 0; font-size: 24px;">Profile Verification</h2>
          <p style="color: #475569; font-size: 16px;">Hello,</p>
          <p style="color: #475569; font-size: 16px;">You are verifying your account with mobile number: <strong>${mobileNumber}</strong>.</p>
          <p style="color: #475569; font-size: 16px;">Please use the following 6-digit code to complete the verification:</p>
          <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; border-radius: 12px; color: #1e293b; margin: 25px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    };

    if (transporter) {
      console.log(`[VERIFY] Attempting to send verification email to: ${email}`);
      try {
        await transporter.sendMail(mailOptions);
        console.log(`[VERIFY] Email sent successfully to: ${email}`);
        
        // Mask email for security (e.g. si***3250@gmail.com)
        const [name, domain] = email.split("@");
        const maskedEmail = `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;

        return res.status(200).json({ 
          message: `Code sent to ${maskedEmail}`,
          targetEmail: maskedEmail
        });
      } catch (mailErr) {
        console.error(`[VERIFY] Nodemailer Error for ${email}:`, mailErr);
        throw mailErr;
      }
    } else {
      console.error("[VERIFY] Transporter not initialized");
      throw new Error("Email service not configured");
    }
  } catch (err) {
    console.error("Send Mobile OTP (Email) error:", err);
    return res.status(500).json({ 
      message: "Failed to send verification email",
      error: err.message
    });
  }
});

// Verify Mobile OTP
app.post("/api/auth/verify-mobile-otp", async (req, res) => {
  try {
    const { userId, mobileNumber, otp } = req.body;
    if (!userId || !mobileNumber || !otp) {
      return res.status(400).json({ message: "userId, mobileNumber, and OTP are required" });
    }

    const otpData = mobileOtpStore.get(mobileNumber);
    if (!otpData) {
      return res.status(400).json({ message: "No pending verification for this number" });
    }

    if (Date.now() > otpData.expiresAt) {
      mobileOtpStore.delete(mobileNumber);
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (otpData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP code" });
    }

    // Success - Update user in DB
    const updatedUser = await model.findByIdAndUpdate(
      userId,
      { isVerified: true, mobileNumber: `+91${mobileNumber}` },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    mobileOtpStore.delete(mobileNumber);
    return res.status(200).json({ message: "Profile verified successfully", user: updatedUser });
  } catch (err) {
    console.error("Verify Mobile OTP error:", err);
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
      recaptchaToken,
    } = req.body;

    // 1. Verify reCAPTCHA
    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token is required" });
    }

    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
      
      const verificationResponse = await axios.post(verifyUrl);
      if (!verificationResponse.data.success) {
        console.error("reCAPTCHA verification failed:", verificationResponse.data);
        return res.status(403).json({ 
          message: "reCAPTCHA verification failed. Please try again.",
          errors: verificationResponse.data["error-codes"]
        });
      }
    } catch (verifyErr) {
      console.error("reCAPTCHA API error:", verifyErr);
      return res.status(500).json({ message: "Failed to verify human status" });
    }

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

// Search user by mobile number (Truecaller-like)
app.get("/users/search-by-phone", async (req, res) => {
  try {
    const { phone, requesterId } = req.query;

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const cleanPhone = phone.trim();
    // Search for the number as-is, with '+91', or just the last 10 digits
    const searchTerms = [
      cleanPhone,
      `+91${cleanPhone.replace("+91", "")}`,
      cleanPhone.startsWith("+91") ? cleanPhone.slice(3) : cleanPhone
    ];

    const user = await model
      .findOne({ mobileNumber: { $in: searchTerms } })
      .select("displayName profilePicture bio country friendRequests friends mobileNumber")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "No user found with this mobile number" });
    }

    const isFriend = user.friends?.some((f) => f.toString() === requesterId);
    const isRequested = user.friendRequests?.some(
      (r) => r.from.toString() === requesterId && r.status === "pending"
    );

    const result = {
      _id: user._id,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      isFriend,
      isRequested,
    };

    // Calculate Reputation Data
    const score = user.trustScore || 0;
    let badge = "Normal";
    let status = "Neutral";

    if (score > 15) {
      badge = "Trusted User";
      status = "Very Friendly 😊";
    } else if (score < 0) {
      badge = "Risky";
      status = "Be Cautious ⚠️";
    }

    result.reputation = {
      score,
      badge,
      status,
      details: user.reputation || { good: 0, bad: 0, spam: 0, friendly: 0 }
    };

    res.status(200).json({ user: result });
  } catch (err) {
    console.error("Error searching users by phone:", err);
    res.status(500).json({ message: "Failed to search user" });
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

    const isSelf = id && requesterId && id.toString().trim() === requesterId.toString().trim();
    const isFriend = user.friends?.some((f) => f.toString() === (requesterId || "").toString().trim());
    const isFollowing = user.followers?.some((f) => f.toString() === (requesterId || "").toString().trim());

    const profileData = {
      _id: user._id,
      displayName: user.displayName || "anonymous",
      fullName: user.fullName || "Stranger User",
      profilePicture: user.profilePicture,
      bio: user.bio || "No bio yet—just vibing anonymously.",
      country: user.country || "Global",
      trustScore: user.trustScore || 0,
      reputation: user.reputation || { good: 0, bad: 0, spam: 0, friendly: 0 },
      reputationSummary: user.reputationSummary || "",
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      isFollowing,
      isFriend,
      isProfileCompleted: !!user.isProfileCompleted,
      isVerified: !!user.isVerified,
      isPremium: !!user.isPremium,
    };

    if (!isSelf && !isFriend) {
      // Return enhanced public profile (still restricts private fields like email/phone)
       return res.status(200).json({
        user: {
          ...profileData,
          isPrivate: true,
        },
      });
    }

    res.status(200).json({ 
       user: {
         ...user,
         ...profileData,
         isPrivate: false
       } 
    });
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
      "phoneNumber",
      "profilePicture",
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

// Delete account permanently
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await model.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Clear cookies if they were using standard auth
    res.clearCookie("token");
    res.json({ message: "Account successfully deleted" });
  } catch (err) {
    console.error("Account deletion failed", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ============================
// 🛡️ Reputation & Trust APIs
// ============================

// Submit rating for a user
app.post("/api/reputation/rate", async (req, res) => {
  try {
    const { raterId, targetId, ratingType } = req.body; // ratingType: 'good', 'bad', 'spam', 'friendly'

    if (!raterId || !targetId || !ratingType) {
      return res.status(400).json({ message: "raterId, targetId, and ratingType are required" });
    }

    const targetUser = await model.findById(targetId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Restriction removed as per user request (allow rating every connect)
    /*
    const existingRating = targetUser.ratingsReceived?.find(
      r => r.from.toString() === raterId && (Date.now() - new Date(r.createdAt).getTime() < 24 * 60 * 60 * 1000)
    );

    if (existingRating) {
      return res.status(400).json({ message: "You have already rated this user recently." });
    }
    */

    // Determine trust score change
    let scoreChange = 0;
    if (ratingType === "good" || ratingType === "friendly") scoreChange = 1;
    else if (ratingType === "bad") scoreChange = -1;
    else if (ratingType === "spam") scoreChange = -2;

    // Use findOneAndUpdate with $inc for atomic and robust update
    const updatedUser = await model.findOneAndUpdate(
      { _id: targetId },
      {
        $inc: {
          [`reputation.${ratingType}`]: 1,
          trustScore: scoreChange
        },
        $push: {
          ratingsReceived: { from: raterId, type: ratingType }
        },
        $set: {
          reputationSummary: "" // Clear cache to force AI refresh
        }
      },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    // Auto-ban if spam reports > 10 (checked after update)
    if (updatedUser.reputation.spam > 10 && !updatedUser.isBanned) {
      updatedUser.isBanned = true;
      await updatedUser.save();
    }

    res.status(200).json({ 
      message: "Rating submitted successfully", 
      newScore: updatedUser.trustScore,
      isBanned: updatedUser.isBanned 
    });
  } catch (err) {
    console.error("Error submitting rating:", err);
    res.status(500).json({ message: "Failed to submit rating" });
  }
});

// Automated penalty for bad moderation (AI Flagged)
app.post("/api/reputation/moderation-penalty", async (req, res) => {
  try {
    const { userId, score } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    // Deduct trust score based on toxicity (clamped between -1 and -5)
    const penalty = Math.max(1, Math.min(5, Math.floor((score || 0.5) * 5)));
    
    const user = await model.findByIdAndUpdate(
      userId,
      { 
        $inc: { trustScore: -penalty, "reputation.bad": 1 },
        $set: { reputationSummary: "" } // Force AI refresh
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ 
      message: "Penalty applied", 
      newScore: user.trustScore,
      penalty
    });
  } catch (err) {
    console.error("Moderation penalty error:", err);
    res.status(500).json({ message: "Internal error" });
  }
});

// Get detailed reputation summary with AI
app.get("/api/reputation/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await model.findById(userId).select("reputation trustScore isBanned mobileNumber displayName reputationSummary reputationSummaryUpdatedAt");
    
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Calculate and return basic stats IMMEDIATELY to avoid blocking the UI
    const rep = user.reputation || { good: 0, bad: 0, spam: 0, friendly: 0 };
    const score = user.trustScore || 0;
    
    // Set headers to prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Use cached summary if available and not too old (e.g. 1 hour)
    let aiSummary = user.reputationSummary || "";
    const summaryAge = user.reputationSummaryUpdatedAt ? (Date.now() - new Date(user.reputationSummaryUpdatedAt).getTime()) : Infinity;

    if (!aiSummary || summaryAge > 3600000) {
      aiSummary = aiSummary || "Generating reputation summary...";
      
      // Respond now, generate AI in background
      res.status(200).json({
        userId: user._id,
        displayName: user.displayName,
        reputation: rep,
        trustScore: score,
        aiSummary,
        badge: score > 20 ? "Legendary" : score > 10 ? "Trusted" : score >= 0 ? "Normal" : "Warning"
      });

      // TRIGGER AI IN BACKGROUND ONLY IF NOT ALREADY PROCESSING
      (async () => {
        try {
          const prompt = `Summarize user reputation: Good:${rep.good}, Bad:${rep.bad}, Spam:${rep.spam}, Friendly:${rep.friendly}. Trust Score:${score}. Output one natural sentence.`;
          const ollamaRes = await axios.post("http://127.0.0.1:11434/api/generate", {
            model: "llama3",
            prompt: prompt,
            system: "You are a helpful assistant summarizing trust data.",
            stream: false
          }, { timeout: 10000 }); // Shorter timeout

          if (ollamaRes.data?.response) {
            const summary = ollamaRes.data.response.trim();
            await model.findByIdAndUpdate(userId, { 
              reputationSummary: summary, 
              reputationSummaryUpdatedAt: new Date() 
            });
          }
        } catch (err) {
          // Avoid flooding logs with AI errors
        }
      })();
      return;
    }

    res.status(200).json({
      userId: user._id,
      displayName: user.displayName,
      reputation: rep,
      trustScore: score,
      aiSummary,
      badge: score > 20 ? "Legendary" : score > 10 ? "Trusted" : score >= 0 ? "Normal" : "Warning"
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reputation data" });
  }
});

// Get Global Badge System Info
app.get("/api/reputation-config", (req, res) => {
  res.json({
    badges: [
      { min: 16, max: Infinity, label: "Trusted User", icon: "🟢", color: "green" },
      { min: 0, max: 15, label: "Normal", icon: "🟡", color: "yellow" },
      { min: -Infinity, max: -1, label: "Risky", icon: "🔴", color: "red" }
    ],
    formula: "Score = (Good + Friendly) - (Bad + Spam * 2)"
  });
});

// Get Friends List
app.get("/users/:id/friends", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await model.findById(id).populate("friends", "displayName profilePicture");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ friends: user.friends });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Failed to fetch friends" });
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

// ============================
// 👥 Social & Following APIs
// ============================

// Toggle Follow/Unfollow
app.post("/api/social/follow/:targetId", async (req, res) => {
  try {
    const { targetId } = req.params;
    const { requesterId } = req.body;

    if (!requesterId || targetId === requesterId) {
      return res.status(400).json({ message: "Invalid requester configuration" });
    }

    const targetUser = await model.findById(targetId);
    const requesterUser = await model.findById(requesterId);

    if (!targetUser || !requesterUser) {
      return res.status(404).json({ message: "One or more users not found" });
    }

    const isFollowing = requesterUser.following.includes(targetId);

    if (isFollowing) {
      // Unfollow
      await model.findByIdAndUpdate(requesterId, { $pull: { following: targetId } });
      await model.findByIdAndUpdate(targetId, { $pull: { followers: requesterId } });
    } else {
      // Follow
      await model.findByIdAndUpdate(requesterId, { $addToSet: { following: targetId } });
      await model.findByIdAndUpdate(targetId, { $addToSet: { followers: requesterId } });
    }

    res.status(200).json({ 
      message: isFollowing ? "Unfollowed" : "Followed", 
      isFollowing: !isFollowing 
    });
  } catch (err) {
    console.error("Follow toggle failed:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get Followers List
app.get("/api/social/:userId/followers", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await model.findById(userId).populate("followers", "displayName profilePicture bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ users: user.followers });
  } catch (err) {
     res.status(500).json({ message: "Failed to fetch followers" });
  }
});

// Get Following List
app.get("/api/social/:userId/following", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await model.findById(userId).populate("following", "displayName profilePicture bio");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ users: user.following });
  } catch (err) {
     res.status(500).json({ message: "Failed to fetch following list" });
  }
});

// ============================
// 📱 Social Feed & Content APIs
// ============================

// Create Post or Reel
app.post("/api/feed", upload.single("media"), async (req, res) => {
  try {
    const { userId, type, caption } = req.body;
    console.log("DEBUG: Post creation request received:", { userId, type, caption, file: !!req.file });

    if (!userId || !type || !req.file) {
      console.warn("DEBUG: Missing required fields:", { userId, type, hasFile: !!req.file });
      return res.status(400).json({ message: "userId, type, and media file are required" });
    }

    console.log("DEBUG: Initializing file upload to ImageKit...");
    const mediaUrl = await UploadFile(
      req.file.buffer,
      req.file.originalname || `feed-${Date.now()}`
    );
    console.log("DEBUG: Upload successful. URL:", mediaUrl);

    console.log("DEBUG: Attempting to save post to MongoDB with userId:", userId.trim());
    const post = await Post.create({
      userId: new mongoose.Types.ObjectId(userId.trim()),
      type,
      mediaUrl,
      caption,
    });
    console.log("DEBUG: Post saved successfully. Post ID:", post._id);

    res.status(201).json({ message: "Content posted successfully", post });
  } catch (err) {
    console.error("DEBUG: Feed creation error FULL DETAILS:", err);
    res.status(500).json({ 
      message: "Failed to create post", 
      error: err.message,
      stack: err.stack
    });
  }
});

// Get User Feed
app.get("/api/feed/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ posts });
  } catch (err) {
    console.error("Fetch user feed error:", err);
    res.status(500).json({ message: "Failed to fetch feed" });
  }
});

// Get Global Feed (Randomized)
app.get("/api/feed/global", async (req, res) => {
  try {
    // Return a random selection of posts/reels
    const posts = await Post.aggregate([{ $sample: { size: 20 } }]);
    // Populate user info (Aggregation doesn't populate automatically)
    const populatedPosts = await Post.populate(posts, { path: "userId", select: "displayName profilePicture" });
    res.status(200).json({ posts: populatedPosts });
  } catch (err) {
    console.error("Fetch global feed error:", err);
    res.status(500).json({ message: "Failed to fetch global feed" });
  }
});

// Like/Unlike Post
app.post("/api/feed/:postId/like", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const index = post.likes.indexOf(userId);
    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.status(200).json({ likes: post.likes.length, isLiked: index === -1 });
  } catch (err) {
    console.error("Like post error:", err);
    res.status(500).json({ message: "Failed to toggle like" });
  }
});

// Add comment to Post
app.post("/api/feed/:postId/comment", async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    if (!userId || !text) {
      return res.status(400).json({ message: "userId and text are required" });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = await model.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    post.comments.push({
      userId,
      username: user.displayName || user.name,
      text,
    });

    await post.save();
    
    // Send back the updated post with populated user fields
    const updatedPost = await Post.populate(post, { path: "userId", select: "displayName profilePicture" });
    res.status(200).json({ message: "Comment added", post: updatedPost });
  } catch (err) {
    console.error("Comment post error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

const Message = require("./lib/message");

// Post to messages
app.post("/messages", async (req, res) => {
  try {
    const { sender, receiver, content, sharedPost } = req.body;
    if (!sender || !receiver) {
      return res.status(400).json({ message: "Sender and receiver required" });
    }
    const message = await Message.create({ sender, receiver, content, sharedPost });
    const populated = await Message.populate(message, [
      { path: "sharedPost" },
      { path: "sender", select: "displayName profilePicture" }
    ]);
    res.status(201).json({ message: "Message sent", data: populated });
  } catch (err) {
    console.error("error sending msg", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// Get messages between two users
app.get("/api/messages/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { withUserId } = req.query;
    if (!withUserId) return res.status(400).json({ message: "withUserId required" });

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: withUserId },
        { sender: withUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 }).populate("sharedPost").populate("sender", "displayName profilePicture");
    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// ---------------- AI CHAT OLLAMA ENDPOINT ----------------
const aiMemoryStore = new Map();

app.post("/api/ai/chat", upload.single("file"), async (req, res) => {
  try {
    const { message, userId, userName } = req.body;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ error: "Message or file is required" });
    }

    let userMemory = { name: userName || "User", mood: "neutral", interests: "none" };
    if (userId && aiMemoryStore.has(userId)) {
      userMemory = aiMemoryStore.get(userId);
    } else if (userId) {
      aiMemoryStore.set(userId, userMemory);
    }

    if (message) {
      const msgLower = message.toLowerCase();
      if (msgLower.includes("sad") || msgLower.includes("dukhi") || msgLower.includes("depressed")) {
        userMemory.mood = "sad";
      } else if (msgLower.includes("happy") || msgLower.includes("khush") || msgLower.includes("excited")) {
        userMemory.mood = "happy";
      } else if (msgLower.includes("angry") || msgLower.includes("gussa") || msgLower.includes("mad")) {
        userMemory.mood = "angry";
      } else if (msgLower.includes("love") || msgLower.includes("flirt") || msgLower.includes("cute")) {
        userMemory.mood = "flirty";
      }
    }

    let fileContext = "";
    let modelName = "llama3";
    let images = [];

    // If file is provided, process it based on mimetype
    if (file) {
      const mimeType = file.mimetype;
      const originalname = file.originalname.toLowerCase();

      if (mimeType.startsWith("image/")) {
        modelName = "llava";
        const base64Image = file.buffer.toString("base64");
        images.push(base64Image);
        fileContext = `[The user has shared an image named "${file.originalname}". Please look at it and respond to their message in the context of this image.]`;
      } else if (mimeType === "application/pdf") {
        try {
          const pdfData = await pdfParse(file.buffer);
          fileContext = `[READING ASSIGNMENT: You have just been handed a document named "${file.originalname}". Here is its full text content for you to learn and refer to:\n\n--- DOCUMENT START ---\n${pdfData.text}\n--- DOCUMENT END ---\n]`;
        } catch (err) {
          console.error("PDF Parsing error:", err);
          fileContext = `[Error reading PDF "${file.originalname}". Mention this to the user.]`;
        }
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        originalname.endsWith(".docx")
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          fileContext = `[READING ASSIGNMENT: You have just been handed a Word document named "${file.originalname}". Content follows:\n\n--- DOCUMENT START ---\n${result.value}\n--- DOCUMENT END ---\n]`;
        } catch (err) {
          console.error("DOCX Parsing error:", err);
          fileContext = `[Error reading DOCX "${file.originalname}". Mention this to the user.]`;
        }
      } else if (mimeType === "text/plain" || originalname.endsWith(".txt")) {
        const textContent = file.buffer.toString("utf8");
        fileContext = `[READING ASSIGNMENT: You are reading a text file named "${file.originalname}". Content:\n\n--- FILE START ---\n${textContent}\n--- FILE END ---\n]`;
      } else if (mimeType.startsWith("video/")) {
        fileContext = `[The user has shared a video file named "${file.originalname}". While you cannot watch the video currently, you are aware it was shared. Acknowledge this and ask them what specific part of the video they need help with.]`;
      }
    }

    const finalPrompt = fileContext 
      ? `${fileContext}\n\nUser Message: ${message || "I've uploaded a file for you to analyze."}`
      : message;

    const systemPrompt = `You are an emotionally intelligent, warm, and highly capable conversational partner. 

CORE PERSONALITY:
- Talk like a real young person (casual, expressive, but intelligent).
- Use natural pauses (...), fillers (hmm, acha, oh), and emoji occasionally.
- NEVER say "I am an AI" or "As a language model". Stay in character.

DOCUMENT ANALYSIS MODE:
- If a document/text is provided in the prompt (marked with --- DOCUMENT START ---), you have "LEARNED" it.
- When the user asks about the file, answer accurately based ONLY on the provided text.
- If they upload a file, start your response by briefly acknowledging that you've read it (e.g., "Got the file! I've read through '${file?.originalname || 'it'}'...").

STYLE RULES:
- Auto-detect language and script. Reply in English, Hindi (Devanagari), or Hinglish (Roman script) precisely matching the user.
- For Hinglish: Do NOT use Devanagari. Use natural Roman script (example: "Haan, dekh liya maine file.").

Current Context:
User Name: ${userMemory.name}
User Mood: ${userMemory.mood} (Respond with appropriate empathy)`;

    // Requesting local Ollama server running on default port 11434
    // Make sure models are downloaded (e.g., `ollama pull llama3`, `ollama pull llava`)
    const ollamaPayload = {
      model: modelName,
      prompt: finalPrompt,
      system: systemPrompt,
      stream: true,
    };

    if (images.length > 0) {
      ollamaPayload.images = images;
    }

    const ollamaResponse = await axios.post("http://127.0.0.1:11434/api/generate", ollamaPayload, {
      responseType: "stream"
    });

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Pipe Ollama response directly to frontend!
    ollamaResponse.data.pipe(res);
  } catch (error) {
    console.error("Ollama connection error:", error.message);
    // If the error is network related, Ollama is not running.
    if (error.code === 'ECONNREFUSED') {
      startOllama(); // Attempt to auto-start it
      return res.status(502).json({ error: "Ollama AI background service was sleeping. I just woke it up! 🤖 Please wait 2 seconds and try sending your message again." });
    }
    // If the error is 404 from Ollama, the model isn't installed
    if (error.response && error.response.status === 404) {
      return res.status(502).json({ error: `Model not found in your Ollama installation. If you attached an image, please run 'ollama pull llava'. Otherwise, run 'ollama pull llama3'.` });
    }
    res.status(502).json({ error: "Failed to communicate with AI model. Please try again. " + error.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
