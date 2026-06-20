const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details including role
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: decoded.id,
      role: user.role
    };
    
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};