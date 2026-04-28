const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ==============================
    // 🔐 Auth Data
    // ==============================

    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    passwordHash: {
      type: String,
    },

    // ==============================
    // 👤 Basic Profile Data
    // ==============================

    fullName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    profilePicture: {
      type: String, // Cloudinary / S3 URL
      default: "",
    },

    bio: {
      type: String,
      maxlength: 300,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dateOfBirth: {
      type: Date,
    },

    country: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    languages: [
      {
        type: String,
        trim: true,
      },
    ],


    // ==============================
    // 🎯 Chat Matching Data
    // ==============================

    interests: [
      {
        type: String,
        trim: true,
      },
    ],

    preferredGender: {
      type: String,
      enum: ["male", "female", "other", "any"],
      default: "any",
    },

    preferredAgeRange: {
      min: {
        type: Number,
        min: 18,
      },
      max: {
        type: Number,
        max: 100,
      },
    },

    preferredLanguage: {
      type: String,
      trim: true,
    },

    regionPreference: {
      type: String,
      enum: ["same_country", "global"],
      default: "global",
    },

    chatMode: {
      type: String,
      enum: ["text", "video", "both"],
      default: "text",
    },

    anonymousMode: {
      type: Boolean,
      default: true,
    },

    allowFriendRequests: {
      type: Boolean,
      default: true,
    },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],

    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    isProfileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    mobileNumber: {
      type: String,
      trim: true,
    },

    // ==============================
    // 🛡️ Reputation & Trust System
    // ==============================

    reputation: {
      good: { type: Number, default: 0 },
      bad: { type: Number, default: 0 },
      spam: { type: Number, default: 0 },
      friendly: { type: Number, default: 0 },
    },

    trustScore: {
      type: Number,
      default: 0,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    ratingsReceived: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        type: { type: String, enum: ["good", "bad", "spam", "friendly"] },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    reputationSummary: {
      type: String,
      default: "",
    },

    reputationSummaryUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const model = mongoose.model("user", userSchema);

module.exports = model;