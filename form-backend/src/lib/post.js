const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    type: {
      type: String,
      enum: ["post", "reel"],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      maxlength: 500,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    views: {
      type: Number,
      default: 0,
    },
    comments: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        username: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
