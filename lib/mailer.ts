import nodemailer from 'nodemailer';

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // If SMTP credentials not provided yet in .env, create test/mock transport with console fallback
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal_password',
      },
    });
  }
  return transporter;
}

export async function sendResidentWelcomeEmail(options: {
  to: string;
  residentName: string;
  pgName: string;
  roomNumber: string;
  email: string;
  password: string;
  monthlyRent: number;
  securityDeposit: number;
}) {
  const { to, residentName, pgName, roomNumber, email, password, monthlyRent, securityDeposit } = options;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #334155; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px 24px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 6px 0 0; opacity: 0.9; font-size: 14px; }
        .body { padding: 28px 24px; }
        .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 14px; }
        .credentials-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0; }
        .cred-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 12px; }
        .cred-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .cred-label { color: #64748b; }
        .cred-value { font-weight: 700; color: #0f172a; font-family: monospace; font-size: 15px; }
        .details-grid { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 18px 0; }
        .btn { display: block; text-align: center; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; margin: 24px 0 16px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${pgName || 'PG Accommodation'}</h1>
          <p>Your resident accommodation profile & login credentials</p>
        </div>
        <div class="body">
          <div class="greeting">Hello ${residentName},</div>
          <p>Your room allocation has been confirmed. Below are your login credentials to access the <strong>PG Resident Mobile & Web Portal</strong>.</p>
          
          <div class="credentials-card">
            <div class="cred-title">🔑 Your Login Credentials</div>
            <div class="cred-row">
              <span class="cred-label">Login URL:</span>
              <span class="cred-value">http://localhost:3000/login</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Registered Email:</span>
              <span class="cred-value">${email}</span>
            </div>
            <div class="cred-row">
              <span class="cred-label">Password:</span>
              <span class="cred-value">${password}</span>
            </div>
          </div>

          <div class="details-grid">
            <div style="font-weight: 700; color: #166534; font-size: 13px; margin-bottom: 8px;">🏠 Allocation Summary</div>
            <div style="font-size: 13px; color: #15803d; line-height: 1.6;">
              • <strong>Allocated Room:</strong> Room ${roomNumber}<br/>
              • <strong>Monthly Rent:</strong> ₹${monthlyRent?.toLocaleString('en-IN')}<br/>
              • <strong>Security Deposit:</strong> ₹${securityDeposit?.toLocaleString('en-IN')}<br/>
            </div>
          </div>

          <p style="font-size: 13px; color: #475569;">
            You can use these credentials to log in, view your monthly rent invoices, submit UPI payments with transaction screenshots, download receipts, and submit complaints.
          </p>

          <a href="http://localhost:3000/login" class="btn">Log In to Resident App</a>
        </div>
        <div class="footer">
          This is an automated onboarding notification from PG Management. Please change your password after logging in.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const mailClient = getTransporter();
    const info = await mailClient.sendMail({
      from: process.env.SMTP_FROM || `"PG Management" <${process.env.SMTP_USER || 'no-reply@pgapp.com'}>`,
      to,
      subject: `Welcome to ${pgName || 'PG Accommodation'} - Your Login Credentials & Room Allocation`,
      html: htmlContent,
      text: `Hello ${residentName},\n\nWelcome to ${pgName}!\n\nYour login credentials:\nEmail: ${email}\nPassword: ${password}\nRoom: ${roomNumber}\nMonthly Rent: ₹${monthlyRent}\n\nLogin at: http://localhost:3000/login`,
    });

    console.log(`[Email] Credentials email successfully sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send email to ${to}:`, err.message);
    // Return gracefully with error info so registration does not fail if SMTP server is unreachable
    return { success: false, error: err.message };
  }
}

