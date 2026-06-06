import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.warn('[protect] ❌ No token provided in request headers.');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. No token provided.',
      });
    }

    // Quick structure check — a JWT must have exactly 3 parts
    if (token.split('.').length !== 3) {
      console.warn('[protect] ❌ Malformed token structure — not a valid JWT.');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid token format.',
      });
    }

    // ── STEP 1: Verify JWT signature and expiry ──────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      console.warn(`[protect] ❌ JWT verification failed: ${jwtErr.message}`);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Invalid or expired token.',
      });
    }

    // ── STEP 2: Confirm user still exists in the database ────
    // This catches: deleted accounts, fake tokens with valid signatures,
    // tokens issued before account deletion.
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.warn(`[protect] ❌ Token valid but user not found in DB (id: ${decoded.userId}). Possible deleted account or fake token.`);
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Account not found. Please sign up or log in.',
      });
    }

    console.log(`[protect] ✅ Auth verified for user: ${user.email}`);
    req.user = user;
    next();
  } catch (error) {
    console.error('[protect] Unexpected error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid or expired token.',
    });
  }
};

export { protect };
