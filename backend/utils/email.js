const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Validate email configuration
  if (!process.env.EMAIL_SMTP_HOST || !process.env.EMAIL_SMTP_USER || !process.env.EMAIL_SMTP_PASS) {
    throw new Error('Email configuration is missing. Please check EMAIL_SMTP_HOST, EMAIL_SMTP_USER, and EMAIL_SMTP_PASS in your .env file.');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS
    }
  });
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Internship Platform" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Your Login OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
            .warning { color: #d32f2f; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Login OTP</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Your One-Time Password (OTP) for login is:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <p class="warning">⚠️ Do not share this OTP with anyone. Our team will never ask for your OTP.</p>
              <p>If you didn't request this OTP, please ignore this email.</p>
              <p>Best regards,<br>Internship Platform Team</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    // Provide more detailed error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your email credentials (EMAIL_SMTP_USER and EMAIL_SMTP_PASS).';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Failed to connect to email server. Please check EMAIL_SMTP_HOST and EMAIL_SMTP_PORT.';
    } else if (error.message.includes('configuration is missing')) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
};

// Send certificate email
const sendCertificateEmail = async (email, userName, certificateUrl, certId) => {
  try {
    const transporter = createTransporter();
    const path = require('path');

    // Assume the file is stored in ../uploads/certificates relative to this file
    // certificateUrl is likely absolute URL, so we construct local path
    const pdfPath = path.join(__dirname, '../uploads/certificates', `cert_${certId}.pdf`);

    const mailOptions = {
      from: `"Internship Platform" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Congratulations! Your Certificate is Ready',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Certificate Ready!</h1>
            </div>
            <div class="content">
              <p>Hello ${userName},</p>
              <p>Congratulations! You have successfully completed your internship and your certificate is ready.</p>
              <p><strong>Certificate ID:</strong> ${certId}</p>
              <p>We have attached your official certificate to this email.</p>
              <p style="text-align: center;">
                <a href="${certificateUrl}" class="button">View Certificate Online</a>
              </p>
              <p>You can also verify your certificate anytime using the verification link.</p>
              <p>Best regards,<br>Internship Platform Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `Certificate_${certId}.pdf`,
          path: pdfPath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Certificate email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending certificate email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendCertificateEmail
};

