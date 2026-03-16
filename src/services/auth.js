import { RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";
import { auth } from "../firebase/config";

// Setup reCAPTCHA
export const setupRecaptcha = (containerId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved
      }
    });
  }
};

// Send OTP
export const sendOTP = async (phoneNumber) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    return true;
  } catch (error) {
    console.error("Error sending OTP", error);
    return false;
  }
};

// Verify OTP
export const verifyOTP = async (otp) => {
  try {
    const result = await window.confirmationResult.confirm(otp);
    return result.user;
  } catch (error) {
    console.error("Error verifying OTP", error);
    throw error;
  }
};

// Logout
export const logoutUser = () => signOut(auth);
