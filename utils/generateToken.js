import jwt from 'jsonwebtoken';

/**
 * Generates a signed JWT token for a user.
 * Token is ONLY generated if a valid payload is provided.
 * @param {Object} payload - Must include userId, username, email
 * @returns {string} Signed JWT token
 */
const generateToken = (payload) => {
  if (!payload || !payload.userId || !payload.email) {
    console.error('[generateToken] ❌ Invalid payload — refusing to generate token:', payload);
    throw new Error('Invalid token payload: userId and email are required.');
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  console.log(`[generateToken] ✅ Token generated for userId: ${payload.userId} (${payload.email})`);
  return token;
};

export default generateToken;
