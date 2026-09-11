import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token required.",
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized. Token required." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from backend environment.");
      return res.status(500).json({ success: false, message: "Server authentication is not configured." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid token payload." });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({
      success: false,
      message: error.name === "TokenExpiredError" ? "Token expired. Please login again." : "Invalid or expired token.",
    });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required." });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "You are not authorized for this action." });
  next();
};

export const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required." });
  if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin access required." });
  next();
};
