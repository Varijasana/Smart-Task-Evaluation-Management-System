// roleMiddleware.js
module.exports = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role)
      return res.status(401).json({ error: "Not authenticated" });

    if (!Array.isArray(roles)) roles = [roles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not authorized to access this resource" });
    }

    next();
  };
};
