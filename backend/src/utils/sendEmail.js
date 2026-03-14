import nodemailer from 'nodemailer';

export const sendContactEmail = async ({ fullName, email, message }) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Graymanager Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: email,
    subject: `Contact Form: ${fullName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
        <div style="background:#111827;padding:20px 28px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">New Contact Form Submission</h2>
        </div>
        <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <p style="background:#f9fafb;padding:12px 16px;border-radius:6px;border-left:3px solid #111827;">${message.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    `,
  });
};

const createTransporter = () =>
  nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

const fmt = (n) => `GH₵${parseFloat(n || 0).toFixed(2)}`;

export const sendVerificationEmail = async (email, fullName, verificationToken) => {
  const transporter = createTransporter();
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

// ─── Job Created Email ────────────────────────────────────────────────────────
export const sendJobCreatedEmail = async (job, businessName) => {
  if (!job.clientEmail) return; // silent — no email provided
  const transporter = createTransporter();

  const materialsRows = (job.materials || []).map(
    (m) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;">${m.materialName}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:center;">${m.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(m.subtotal)}</td>
    </tr>`
  ).join('');

  const miscRow = parseFloat(job.miscellaneousCost || 0) > 0
    ? `<tr><td colspan="2" style="padding:6px 8px;color:#555;">Miscellaneous</td><td style="padding:6px 8px;text-align:right;">${fmt(job.miscellaneousCost)}</td></tr>`
    : '';

  try {
    await transporter.sendMail({
      from: `"${businessName || 'Gray Manager'}" <${process.env.EMAIL_USER}>`,
      to: job.clientEmail,
      subject: `Job Received — ${job.jobType?.charAt(0).toUpperCase()}${job.jobType?.slice(1)} Service`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:#111827;padding:24px 28px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">${businessName || 'Gray Manager'}</h2>
            <p style="color:#9ca3af;margin:4px 0 0;font-size:13px;">Job Card Confirmation</p>
          </div>
          <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="font-size:15px;">Dear <strong>${job.clientName}</strong>,</p>
            <p>Your vehicle has been received and a job card has been created. Our team will begin work shortly.</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
              <tr><td style="padding:6px 0;color:#666;width:40%;">Job Type</td><td style="padding:6px 0;font-weight:600;text-transform:capitalize;">${job.jobType}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Status</td><td style="padding:6px 0;"><span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:100px;font-size:12px;font-weight:600;">Pending</span></td></tr>
              <tr><td style="padding:6px 0;color:#666;">Issue</td><td style="padding:6px 0;">${job.problemType}</td></tr>
              ${job.vehicleMake ? `<tr><td style="padding:6px 0;color:#666;">Vehicle</td><td style="padding:6px 0;">${job.vehicleMake} ${job.vehicleModel || ''} ${job.vehicleRegNumber ? '· ' + job.vehicleRegNumber : ''}</td></tr>` : ''}
            </table>

            ${materialsRows ? `
            <p style="font-weight:700;margin:16px 0 8px;">Materials / Services</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f9fafb;">
                <th style="padding:6px 8px;text-align:left;">Item</th>
                <th style="padding:6px 8px;text-align:center;">Qty</th>
                <th style="padding:6px 8px;text-align:right;">Amount</th>
              </tr></thead>
              <tbody>${materialsRows}</tbody>
            </table>` : ''}

            <table style="width:100%;margin-top:12px;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;">Labour</td><td style="padding:4px 0;text-align:right;">${fmt(job.labourCost)}</td></tr>
              ${miscRow}
              <tr style="font-weight:700;font-size:15px;border-top:2px solid #111827;">
                <td style="padding:8px 0;">Total Estimate</td>
                <td style="padding:8px 0;text-align:right;">${fmt(job.totalCost)}</td>
              </tr>
            </table>

            <p style="margin-top:20px;font-size:12px;color:#9ca3af;">
              This is an estimate. Final amount may vary. You will receive another email when the job is completed.
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Job created email sent to ${job.clientEmail}`);
  } catch (err) {
    console.error('Failed to send job created email:', err.message);
    // Non-fatal — do not throw
  }
};

// ─── Job Completed Email ──────────────────────────────────────────────────────
export const sendJobCompletedEmail = async (job, businessName) => {
  if (!job.clientEmail) return;
  const transporter = createTransporter();

  const miscRow = parseFloat(job.miscellaneousCost || 0) > 0
    ? `<tr><td style="padding:6px 0;color:#666;">Miscellaneous</td><td style="padding:6px 0;text-align:right;">${fmt(job.miscellaneousCost)}</td></tr>`
    : '';

  try {
    await transporter.sendMail({
      from: `"${businessName || 'Gray Manager'}" <${process.env.EMAIL_USER}>`,
      to: job.clientEmail,
      subject: `Your Vehicle is Ready — ${job.problemType}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:#111827;padding:24px 28px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">${businessName || 'Gray Manager'}</h2>
            <p style="color:#9ca3af;margin:4px 0 0;font-size:13px;">Job Completion Notice</p>
          </div>
          <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="font-size:15px;">Dear <strong>${job.clientName}</strong>,</p>
            <p>Great news! Your vehicle is ready for collection.</p>

            <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
              <tr><td style="padding:6px 0;color:#666;width:40%;">Job Type</td><td style="padding:6px 0;text-transform:capitalize;">${job.jobType}</td></tr>
              <tr><td style="padding:6px 0;color:#666;">Status</td><td style="padding:6px 0;"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:100px;font-size:12px;font-weight:600;">Completed</span></td></tr>
              <tr><td style="padding:6px 0;color:#666;">Issue Fixed</td><td style="padding:6px 0;">${job.problemType}</td></tr>
              ${job.vehicleRegNumber ? `<tr><td style="padding:6px 0;color:#666;">Vehicle</td><td style="padding:6px 0;">${job.vehicleMake || ''} ${job.vehicleModel || ''} · ${job.vehicleRegNumber}</td></tr>` : ''}
            </table>

            <table style="width:100%;margin-top:12px;font-size:13px;border-top:1px solid #e5e7eb;">
              <tr><td style="padding:6px 0;color:#666;">Labour</td><td style="padding:6px 0;text-align:right;">${fmt(job.labourCost)}</td></tr>
              ${miscRow}
              <tr style="font-weight:700;font-size:16px;border-top:2px solid #111827;">
                <td style="padding:8px 0;">Amount Due</td>
                <td style="padding:8px 0;text-align:right;">${fmt(job.totalCost)}</td>
              </tr>
            </table>

            <p style="margin-top:20px;font-size:13px;color:#374151;">
              Please visit us to collect your vehicle and settle the payment. Thank you for choosing ${businessName || 'us'}!
            </p>
            <p style="font-size:12px;color:#9ca3af;margin-top:16px;">
              ${businessName || 'Gray Manager'} · Gray Manager Auto Workshop Management
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Job completed email sent to ${job.clientEmail}`);
  } catch (err) {
    console.error('Failed to send job completed email:', err.message);
    // Non-fatal — do not throw
  }
};

// ─── Reminder Email ───────────────────────────────────────────────────────────
export const sendReminderEmail = async (to, { customerName, message, type, businessName }) => {
  if (!to) return;
  const transporter = createTransporter();

  const subjectMap = {
    post_job: `How was your recent service at ${businessName}?`,
    service_due: `Your vehicle is due for service at ${businessName}`,
    invoice_overdue: `Payment reminder from ${businessName}`,
    manual: `Message from ${businessName}`,
  };
  const subject = subjectMap[type] || subjectMap.manual;

  try {
    await transporter.sendMail({
      from: `"${businessName || 'Gray Manager'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
          <div style="background:#111827;padding:24px 28px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">${businessName || 'Gray Manager'}</h2>
          </div>
          <div style="padding:24px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="font-size:15px;">Dear <strong>${customerName}</strong>,</p>
            <p style="font-size:14px;color:#374151;">${message ? message.replace(/\n/g, '<br>') : subject}</p>
            <p style="margin-top:24px;font-size:12px;color:#9ca3af;">
              ${businessName || 'Gray Manager'} · Auto Workshop Management
            </p>
          </div>
        </div>
      `,
    });
    console.log(`Reminder email sent to ${to}`);
  } catch (err) {
    console.error('Failed to send reminder email:', err.message);
    // Non-fatal — do not throw
  }
};
