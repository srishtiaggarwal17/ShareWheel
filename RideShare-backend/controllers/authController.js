const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Helper function to validate NITJ email
const isValidNITJEmail = (email) => {
  return email && email.toLowerCase().endsWith('@nitj.ac.in');
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate NITJ email domain
    if (!isValidNITJEmail(email)) {
      return res.status(400).json({ 
        message: "Only @nitj.ac.in email addresses are allowed. Please use your NITJ email." 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email: email.toLowerCase(), // Store email in lowercase for consistency
      password: hashed,
    });

    await user.save();
    
    // Optional: Auto-login after registration (return token)
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Validate NITJ email domain
    if (!isValidNITJEmail(email)) {
      return res.status(401).json({ 
        message: "Only @nitj.ac.in email addresses are allowed. Please use your NITJ email." 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return both token and user details
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging in", error: error.message });
  }
};
