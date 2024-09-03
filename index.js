const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { MONGODB_URL } = require("./utils/config");
const userRoutes = require("./routes/userRoutes");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "dist")));

// frontend on the root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

// the password reset page
app.get("/password-reset/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

app.use("/api", userRoutes);

mongoose
  .connect(MONGODB_URL)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
      console.log("Server is running on port http://localhost:3000");
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
