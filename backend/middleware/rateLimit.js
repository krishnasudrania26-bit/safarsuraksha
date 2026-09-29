const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 60 } = {}) {
  return (req, res, next) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now - existing.start >= windowMs) {
      buckets.set(key, { start: now, count: 1 });
      return next();
    }

    existing.count += 1;
    if (existing.count > max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again shortly.",
      });
    }

    return next();
  };
}

module.exports = rateLimit;
