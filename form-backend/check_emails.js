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
    const users = await User.find({ email: /sitaram/i });
    console.log("Users with sitaram in email:");
    users.forEach(u => console.log(`- ${u.displayName} (${u.email}) [ID: ${u._id}]`));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUser();
