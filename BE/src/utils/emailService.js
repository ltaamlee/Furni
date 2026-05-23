const nodemailer = require('nodemailer');

// Create transporter
const createTransport = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send OTP email for registration
const sendRegistrationOTP = async (email, otp) => {
  const transporter = createTransport();

  const mailOptions = {
    from: `"Furni E-commerce" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Account - Furni E-commerce',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Furni E-commerce!</h2>
        <p>Thank you for registering with us. To complete your registration, please verify your email address using the OTP code below:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p><strong>Important:</strong> This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from Furni E-commerce. Please do not reply to this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Registration OTP sent to ${email}`);
  } catch (error) {
    console.error('Error sending registration OTP:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Send OTP email for password reset
const sendPasswordResetOTP = async (email, otp) => {
  const transporter = createTransport();

  const mailOptions = {
    from: `"SORA E-commerce" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset - Furni E-commerce',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>We received a request to reset your password. Use the OTP code below to reset your password:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #dc3545; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p><strong>Important:</strong> This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from Furni E-commerce. Please do not reply to this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset OTP sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset OTP:', error);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = {
  sendRegistrationOTP,
  sendPasswordResetOTP
};