import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, fullName, verificationToken) => {
  // Hostinger SMTP Configuration
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465, // 465 is the standard secure port for Hostinger
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,     // Your full Hostinger email (e.g., hello@yourdomain.com)
      pass: process.env.EMAIL_PASSWORD, // Your Hostinger email password
    },
  });

  // The link points to your React frontend, which will capture the token
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"Gray Manager" <${process.env.EMAIL_USER}>`, 
    to: email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Gray Manager, ${fullName}!</h2>
        <p>We're excited to have you on board. Click the button below to verify your email and set up your workspace.</p>
        <a href="${verificationUrl}" style="padding: 12px 24px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold;">
          Verify Email
        </a>
        <p style="margin-top: 20px; font-size: 13px; color: #666666;">
          If you didn't create an account, you can safely ignore this email.<br>
          This link will expire in 24 hours.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send verification email.");
  }
};