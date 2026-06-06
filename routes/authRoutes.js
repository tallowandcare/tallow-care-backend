import express from 'express';
import {
  checkUsername,
  sendEmailOTP,
  verifyEmailOTP,
  signup,
  login,
  googleAuth,
  getProfile,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Existing routes (unchanged) ───────────────────────────────
router.post('/check-username', checkUsername);
router.post('/send-email-otp', sendEmailOTP);
router.post('/verify-email-otp', verifyEmailOTP);
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);

router.get('/profile', protect, getProfile);

// ── Password reset routes (new) ───────────────────────────────
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
