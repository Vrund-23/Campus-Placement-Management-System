const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a welcome email to a newly created TPC
 */
const sendTPCWelcomeEmail = async (toEmail, name, password) => {
  // If SMTP is not configured, just log and skip
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your_email@gmail.com") {
    console.log(`[EMAIL SKIPPED] SMTP not configured. Would have sent to: ${toEmail}`);
    console.log(`  Name: ${name}, Password: ${password}`);
    return { success: false, reason: "SMTP not configured" };
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'CPMS'}" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Welcome to CPMS – Your TPC Account is Ready",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎓 CPMS Placement Cell</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Campus Placement Management System</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            You have been appointed as a <strong>Training & Placement Coordinator (TPC)</strong>.
            Your account has been created by the TPO. You can now log in and start verifying student profiles from your department.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #1e40af;">Your Login Credentials</p>
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; padding: 4px 0; width: 120px;">Email:</td>
                <td style="color: #0f172a; font-weight: 500;">${toEmail}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Password:</td>
                <td style="color: #0f172a; font-family: monospace; font-weight: 600; font-size: 16px;">${password}</td>
              </tr>
            </table>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠️ Please change your password after your first login for security.</p>
          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:5173/login" style="background: #2563eb; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; display: inline-block;">
              Log In Now →
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          This is an automated message from CPMS. Please do not reply.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] TPC welcome email sent to ${toEmail} — ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send welcome email to ${toEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send a welcome email to a newly created TPF
 */
const sendTPFWelcomeEmail = async (toEmail, name, password) => {
  // If SMTP is not configured, just log and skip
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your_email@gmail.com") {
    console.log(`[EMAIL SKIPPED] SMTP not configured. Would have sent to: ${toEmail}`);
    console.log(`  Name: ${name}, Password: ${password}`);
    return { success: false, reason: "SMTP not configured" };
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'CPMS'}" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Welcome to CPMS – Your TPF Account is Ready",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #1e40af); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎓 CPMS Placement Cell</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Campus Placement Management System</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            You have been appointed as a <strong>Training & Placement Faculty (TPF)</strong>.
            Your account has been created by the TPO. You can now log in and manage placement activities for your department.
          </p>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #1e40af;">Your Login Credentials</p>
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; padding: 4px 0; width: 120px;">Email:</td>
                <td style="color: #0f172a; font-weight: 500;">${toEmail}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Password:</td>
                <td style="color: #0f172a; font-family: monospace; font-weight: 600; font-size: 16px;">${password}</td>
              </tr>
            </table>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠️ Please change your password after your first login for security.</p>
          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:5173/login" style="background: #2563eb; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; display: inline-block;">
              Log In Now →
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          This is an automated message from CPMS. Please do not reply.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] TPF welcome email sent to ${toEmail} — ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send welcome email to ${toEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send a welcome email to a newly created Student
 */
const sendStudentWelcomeEmail = async (toEmail, name, password) => {
  // If SMTP is not configured, just log and skip
  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your_email@gmail.com") {
    console.log(`[EMAIL SKIPPED] SMTP not configured. Would have sent to: ${toEmail}`);
    console.log(`  Name: ${name}, Password: ${password}`);
    return { success: false, reason: "SMTP not configured" };
  }

  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'CPMS'}" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Welcome to CPMS – Your Student Account is Ready",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎓 CPMS Student Portal</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Campus Placement Management System</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${name}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Your profile has been added to the <strong>Campus Placement Management System (CPMS)</strong> by your department's TPC.
            You can now log in to complete your profile, upload your resume, and apply for upcoming placement drives.
          </p>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #065f46;">Your Login Credentials</p>
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b; padding: 4px 0; width: 120px;">Email:</td>
                <td style="color: #0f172a; font-weight: 500;">${toEmail}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Password:</td>
                <td style="color: #0f172a; font-family: monospace; font-weight: 600; font-size: 16px;">${password}</td>
              </tr>
            </table>
          </div>
          <p style="color: #ef4444; font-size: 13px;">⚠️ Please change your password after your first login for security.</p>
          <div style="text-align: center; margin-top: 28px;">
            <a href="http://localhost:5173/login" style="background: #10b981; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; display: inline-block;">
              Log In to Portal →
            </a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          This is an automated message from CPMS. Please do not reply.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SENT] Student welcome email sent to ${toEmail} — ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send welcome email to ${toEmail}:`, error.message);
    return { success: false, reason: error.message };
  }
};

module.exports = { sendTPCWelcomeEmail, sendTPFWelcomeEmail, sendStudentWelcomeEmail };
