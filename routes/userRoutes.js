const express = require("express");
const User = require("../models/user");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Create a transporter for nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Route to request password reset
router.post("/request-reset", async (req, res) => {
  console.log("Request body:", req.body);
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // Token expires in 1 hour

    // Save token and expiry in DB
    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    // Send email
    const resetLink = `http://localhost:5174/password-reset/${token}`;
    await transporter.sendMail({
      to: email,
      subject: "Password Reset",
      text: `Click the link to reset your password: ${resetLink}`,
    });

    res.status(200).json({ message: "Reset link sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.error("Error requesting password reset:", error);
  }
});

// Route to check if the user exists based on email
router.get("/check-user/:email", async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (user) {
      res.status(200).json({ exists: true });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Define the route to handle password reset
router.put("/update-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long" });
  }

  try {
    const user = await User.findOne({ resetToken: token });

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update the user's password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null; // Clear the reset token
    user.resetTokenExpiry = null; // Clear the reset token expiry
    await user.save();

    res.status(200).json({ message: "Password successfully updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to get all users (new endpoint)
router.get("/all-users", async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Route to add a new user
router.post("/add-user", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create a new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    // Save the user to the database
    await newUser.save();

    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

const path = require("path");

module.exports = router;
