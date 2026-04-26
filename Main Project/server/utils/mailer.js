import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const from = `"Accident Response System" <${process.env.SMTP_USER || 'noreply@example.com'}>`;

export const sendNewSOSEmail = async (alertData) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || !process.env.SMTP_USER) return;

    try {
        await transporter.sendMail({
            from,
            to: adminEmail,
            subject: `🚨 New SOS Alert from ${alertData.userName}`,
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0A0A0F; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #FF2D55, #00D4FF); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px;">🚨 NEW SOS ALERT</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 16px;">A new emergency SOS has been triggered.</p>
            <table style="width: 100%; font-size: 14px; color: #D1D5DB;">
              <tr><td style="padding: 8px 0; color: #6B7280;">Name</td><td style="padding: 8px 0; font-weight: 600;">${alertData.userName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280;">Phone</td><td style="padding: 8px 0;"><a href="tel:${alertData.userPhone}" style="color: #00D4FF;">${alertData.userPhone}</a></td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280;">Location</td><td style="padding: 8px 0;">${alertData.location?.address || `${alertData.location?.lat?.toFixed(4)}, ${alertData.location?.lng?.toFixed(4)}`}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280;">Triggered Via</td><td style="padding: 8px 0; text-transform: uppercase;">${alertData.triggeredVia}</td></tr>
              <tr><td style="padding: 8px 0; color: #6B7280;">Time</td><td style="padding: 8px 0;">${new Date().toLocaleString()}</td></tr>
            </table>
            <p style="margin-top: 20px; font-size: 12px; color: #6B7280;">Log into the admin dashboard to assign a worker and respond.</p>
          </div>
        </div>
      `,
        });
        console.log('SOS email sent to admin');
    } catch (err) {
        console.error('Failed to send SOS email:', err.message);
    }
};

export const sendResolutionConfirmEmail = async (userEmail, alertData) => {
    if (!userEmail || !process.env.SMTP_USER) return;

    try {
        await transporter.sendMail({
            from,
            to: userEmail,
            subject: '✅ Your SOS Alert — Please confirm resolution',
            html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0A0A0F; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
          <div style="background: linear-gradient(135deg, #30D158, #00D4FF); padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; letter-spacing: 2px;">✅ Resolution Pending</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #D1D5DB; font-size: 14px;">The admin has marked your SOS alert as resolved. Please log in and confirm whether the issue has been resolved.</p>
            <p style="color: #9CA3AF; font-size: 13px; margin-top: 12px;">Alert ID: ${alertData._id}</p>
            <p style="color: #9CA3AF; font-size: 13px;">Location: ${alertData.location?.address || 'Unknown'}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #6B7280;">Log into your dashboard to confirm or dispute the resolution.</p>
          </div>
        </div>
      `,
        });
        console.log('Resolution confirm email sent to user');
    } catch (err) {
        console.error('Failed to send resolution email:', err.message);
    }
};
