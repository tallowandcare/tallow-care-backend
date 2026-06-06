import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit OTP
 * @returns {string} 6-digit OTP string
 */
const generateOTP = () => {
  // Generate a random number between 100000 and 999999
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
};

export default generateOTP;
