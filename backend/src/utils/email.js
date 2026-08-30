const nodemailer = require("nodemailer");
const env = require("../config/env");

let cachedTransporter = null;

const canSendEmail = () => {
  return Boolean(
    (env.resendApiKey && env.resendFromEmail) ||
    (env.smtpHost && env.smtpUser && env.smtpPass && env.smtpFrom),
  );
};

const getResendEmailConfiguration = () => ({
  apiKey: Boolean(env.resendApiKey),
  sender: Boolean(env.resendFromEmail),
});

const getMissingResendSettings = () =>
  Object.entries(getResendEmailConfiguration())
    .filter(([, configured]) => !configured)
    .map(
      ([key]) =>
        ({
          apiKey: "RESEND_API_KEY",
          sender: "RESEND_FROM_EMAIL",
        }[key]),
    );

const getTransporter = () => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom)
    return null;
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return cachedTransporter;
};

const sendEmailViaResend = async ({ to, subject, text, html }) => {
  const recipients = Array.isArray(to) ? to : [to];
  const headers = {
    Authorization: `Bearer ${env.resendApiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const body = {
    from: env.resendFromEmail,
    to: recipients,
    subject,
  };
  if (text) body.text = text;
  if (html) body.html = html;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.message || data.error || `HTTP ${res.status}`;
    throw new Error(`Resend email failed: ${detail}`);
  }

  return data;
};

const sendEmail = async ({ to, subject, text, html }) => {
  // Resend is the primary transactional email provider.
  let resendError = null;
  if (env.resendApiKey && env.resendFromEmail) {
    try {
      await sendEmailViaResend({ to, subject, text, html });
      console.log(`[RESEND] Email dispatched to ${Array.isArray(to) ? to.join(", ") : to}`);
      return;
    } catch (err) {
      console.error("[RESEND] Email dispatch error:", err.message);
      resendError = err;
      // Fall through to SMTP when it is intentionally configured.
    }
  }

  // Optional Nodemailer SMTP fallback.
  const transporter = getTransporter();
  if (!transporter) {
    if (resendError) {
      throw new Error(
        `Resend rejected the email request: ${resendError.message}. ` +
          "Check the API key, sending permission, and verified sender domain.",
      );
    }
    const missing = getMissingResendSettings();
    throw new Error(
      missing.length
        ? `Email delivery is not configured. In Vercel, set: ${missing.join(", ")}.`
        : "No email transport configured. Set Resend or SMTP settings in Vercel.",
    );
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  });
  console.log(`[SMTP] Email dispatched to ${to}`);
};

module.exports = {
  canSendEmail,
  getResendEmailConfiguration,
  sendEmail,
  sendEmailViaResend,
};
