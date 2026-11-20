const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI && process.env.MONGO_URI.trim();

  if (!uri) {
    throw new Error("mongodb://localhost:27017/rubyhotel");
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("MONGO_URI must start with mongodb:// or mongodb+srv://.");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = connectDB;