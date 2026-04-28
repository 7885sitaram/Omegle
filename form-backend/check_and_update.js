const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const userSchema = new mongoose.Schema({
  email: String,
  displayName: String,
});

const User = mongoose.model("user", userSchema);

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const user = await User.findOne({ displayName: "user2" });
    if (user) {
      console.log("Current email for user2:", user.email);
      // Let's update it to the user's real email if it's currently sitaramp@gmail.com
      if (user.email === "sitaramp@gmail.com") {
        user.email = "sitaramprajapati3250@gmail.com";
        await user.save();
        console.log("Updated email to:", user.email);
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
