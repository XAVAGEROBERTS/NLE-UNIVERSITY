// src/utils/passwordUtils.js
import bcrypt from 'bcryptjs';

// Password hashing utility
export const passwordUtils = {
  // Hash a password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  },

  // Verify a password
  async verifyPassword(inputPassword, storedHash) {
    return await bcrypt.compare(inputPassword, storedHash);
  },

  // Check if password is strong enough
  isPasswordStrong(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && 
               hasUpperCase && 
               hasLowerCase && 
               hasNumbers && 
               hasSpecialChar,
      requirements: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  }
};