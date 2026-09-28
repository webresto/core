/** Six digits; a fixed code in demo mode and, outside production, `DEFAULT_OTP` when set. */
export function generateOtp() {
  if((process.env.DEMO_MODE || "").toLowerCase() === "true") {
    return "999999";
  }

  if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP) {
    return process.env.DEFAULT_OTP;
  }

  let digits = '1234567890';
  let otp = ''
  for (let i = 0; i < 6; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}
