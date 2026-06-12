import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Otp from '../models/Otp.js';
import generateOTP from '../utils/generateOTP.js';
import generateToken from '../utils/generateToken.js';
import { sendOTPEmail } from '../utils/sendMail.js';
import { sendPasswordResetEmail } from '../utils/sendPasswordResetEmail.js'; // ← NEW
import axios from 'axios';

const verifyTurnstile = async (token) => {
  const response = await axios.post(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data.success;
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────
// @desc   Check username availability
// @route  POST /auth/check-username
// @access Public
// ─────────────────────────────────────────────
const checkUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username must be at least 3 characters.',
      });
    }

    const cleanUsername = username.toLowerCase().trim();
    const usernameRegex = /^[a-z0-9_]+$/;

    if (!usernameRegex.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        available: false,
        message: 'Username can only contain letters, numbers, and underscores.',
      });
    }

    const existingUser = await User.findOne({ username: cleanUsername });

    return res.status(200).json({
      success: true,
      available: !existingUser,
      message: existingUser ? 'Username already taken.' : 'Username available.',
    });
  } catch (error) {
    console.error('[checkUsername] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Send email OTP (signup)
// @route  POST /auth/send-email-otp
// @access Public
// ─────────────────────────────────────────────
const sendEmailOTP = async (req, res) => {
  console.log("=== SEND OTP ROUTE HIT ===");

  try {
    console.log("Request body:", req.body);

    const { email, fullName } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please login.',
      });
    }

    await Otp.deleteMany({ email: cleanEmail });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOTP = await bcrypt.hash(otp, 10);

    await Otp.create({ email: cleanEmail, otp: hashedOTP, expiresAt });
    await sendOTPEmail(cleanEmail, otp, fullName || 'there');

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`,
    });
  } catch (error) {
    console.error('[sendEmailOTP] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Verify email OTP (signup)
// @route  POST /auth/verify-email-otp
// @access Public
// ─────────────────────────────────────────────
const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await Otp.findOne({ email: cleanEmail });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.',
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.',
      });
    }

    otpRecord.verified = true;
    await otpRecord.save();

    res.status(200).json({ success: true, message: 'OTP verified successfully.' });
  } catch (error) {
    console.error('[verifyEmailOTP] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Create account after OTP verification
// @route  POST /auth/signup
// @access Public
// ─────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    const otpRecord = await Otp.findOne({ email: cleanEmail, verified: true });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified. Please complete OTP verification first.',
      });
    }

    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const usernameExists = await User.findOne({ username: cleanUsername });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      authProvider: 'local',
      isVerified: true,
    });

    await Otp.deleteMany({ email: cleanEmail });

    console.log(`[signup] ✅ New account created: ${cleanEmail}`);

    const token = generateToken({
      userId: user._id,
      username: user.username,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture || null,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('[signup] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during account creation.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Login with username/email + password
// @route  POST /auth/login
// @access Public
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { identifier, password, captchaToken } = req.body;

    console.log(`[login] Login attempt for identifier: "${identifier}"`);

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email and password are required.',
      });
    }

    const cleanIdentifier = identifier.toLowerCase().trim();

    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });
    if (!user) {
      console.log(`[login] ❌ No user found for identifier: "${cleanIdentifier}"`);
      return res.status(401).json({
        success: false,
        message: "You don't have an account with Tallow and Care. Please sign up first.",
      });
    }

    if (user.captchaRequired) {
      if (!captchaToken) {
        return res.status(400).json({
          success: false,
          captchaRequired: true,
          message: 'Captcha required',
        });
      }

      const captchaValid = await verifyTurnstile(captchaToken);

      if (!captchaValid) {
        return res.status(400).json({
          success: false,
          captchaRequired: true,
          message: 'Invalid captcha',
        });
      }

      user.captchaRequired = false;
      await user.save();
    }

    console.log(`[login] User found: ${user.email} (provider: ${user.authProvider})`);

    if (user.authProvider === 'google' && !user.password) {
      console.log(`[login] ❌ Account is Google-only, no password set.`);
      return res.status(401).json({
        success: false,
        message: 'This account uses Google Sign-In. Please continue with Google.',
      });
    }

    if (!user.password) {
      console.log(`[login] ❌ User has no password stored.`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please try again.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= 3) {
        user.captchaRequired = true;
      }

      await user.save();

      return res.status(401).json({
        success: false,
        captchaRequired: user.captchaRequired,
        message: 'Incorrect password. Please try again.',
      });
    }

    console.log(`[login] ✅ Password verified. Generating token for: ${user.email}`);
    user.failedLoginAttempts = 0;
    user.captchaRequired = false;
    await user.save();

    const token = generateToken({
      userId: user._id,
      username: user.username,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture || null,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('[login] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Google OAuth authentication
// @route  POST /auth/google
// @access Public
// ─────────────────────────────────────────────
const generateUniqueUsername = async (displayName) => {
  let base = displayName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 20);

  if (!base) base = 'user';

  let username = base;
  let attempt = 0;

  while (true) {
    const exists = await User.findOne({ username });
    if (!exists) return username;
    attempt++;
    username = `${base}${attempt === 1 ? '' : attempt}${Math.floor(Math.random() * 900 + 100)}`;
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required.' });
    }

    let googleId, email, name, picture, email_verified;

    try {
      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${credential}` } }
      );

      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        googleId = userInfo.sub;
        email = userInfo.email;
        name = userInfo.name;
        picture = userInfo.picture;
        email_verified = userInfo.email_verified;
        console.log(`[googleAuth] Verified via access token for: ${email}`);
      } else {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        googleId = payload.sub;
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
        email_verified = payload.email_verified;
        console.log(`[googleAuth] Verified via ID token for: ${email}`);
      }
    } catch (innerErr) {
      console.error('[googleAuth] Token verification error:', innerErr.message);
      return res.status(400).json({ success: false, message: 'Invalid Google token.' });
    }

    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google account email is not verified.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: cleanEmail });
    let isNewUser = false;

    if (user) {
      console.log(`[googleAuth] Existing user found: ${cleanEmail}`);
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        updated = true;
      }
      if (picture && user.profilePicture !== picture) {
        user.profilePicture = picture;
        updated = true;
      }
      if (updated) await user.save();
    } else {
      console.log(`[googleAuth] New Google user — creating account for: ${cleanEmail}`);
      isNewUser = true;
      const username = await generateUniqueUsername(name || 'user');

      user = await User.create({
        fullName: name || 'Google User',
        username,
        email: cleanEmail,
        googleId,
        profilePicture: picture || null,
        authProvider: 'google',
        isVerified: true,
      });
    }

    const token = generateToken({
      userId: user._id,
      username: user.username,
      email: user.email,
    });

    const freshUser = await User.findById(user._id).select('-password');

    console.log(`[googleAuth] ✅ Google auth success for: ${cleanEmail} (new: ${isNewUser})`);

    res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created successfully!' : 'Logged in successfully!',
      token,
      user: {
        id: freshUser._id,
        fullName: freshUser.fullName,
        username: freshUser.username,
        email: freshUser.email,
        profilePicture: freshUser.profilePicture || null,
        authProvider: freshUser.authProvider,
        isVerified: freshUser.isVerified,
      },
    });
  } catch (error) {
    console.error('[googleAuth] Error:', error.message);
    res.status(500).json({ success: false, message: 'Google authentication failed.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Get current user profile (protected)
// @route  GET /auth/profile
// @access Private
// ─────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    console.log(`[getProfile] Profile fetched for: ${user.email}`);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture || null,
        authProvider: user.authProvider,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('[getProfile] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Request a password-reset OTP
// @route  POST /auth/forgot-password
// @access Public
// ─────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    // Intentionally vague — don't reveal whether the email is registered
    if (!user) {
      console.log(`[forgotPassword] Email not found (silent): ${cleanEmail}`);
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset code has been sent.',
      });
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please log in with Google instead.',
      });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = hashedOtp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendPasswordResetEmail(cleanEmail, otp, user.fullName.split(' ')[0]);

    console.log(`[forgotPassword] ✅ Reset OTP sent to: ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset code has been sent.',
    });
  } catch (error) {
    console.error('[forgotPassword] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send reset code. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Verify the password-reset OTP
// @route  POST /auth/verify-reset-otp
// @access Public
// ─────────────────────────────────────────────
const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No reset code found for this email. Please request a new one.',
      });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code. Please check and try again.',
      });
    }

    console.log(`[verifyResetOtp] ✅ OTP verified for: ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified. You may now reset your password.',
    });
  } catch (error) {
    console.error('[verifyResetOtp] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─────────────────────────────────────────────
// @desc   Reset password after OTP verification
// @route  POST /auth/reset-password
// @access Public
// ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'No reset session found. Please start over.',
      });
    }

    if (new Date() > user.otpExpiry) {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please start over.',
      });
    }

    // Re-validate OTP — prevents skipping straight to this endpoint
    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code. Please start over.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    user.failedLoginAttempts = 0;
    user.captchaRequired = false;
    await user.save();

    console.log(`[resetPassword] ✅ Password reset successfully for: ${cleanEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('[resetPassword] Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

export {
  checkUsername,
  sendEmailOTP,
  verifyEmailOTP,
  signup,
  login,
  googleAuth,
  getProfile,
  forgotPassword,   // ← NEW
  verifyResetOtp,   // ← NEW
  resetPassword,    // ← NEW
};
