const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;
  const credentials = [SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM];
  if (credentials.every((value) => !value)) {
    return null;
  }
  if (credentials.some((value) => !value) || !SMTP_PORT) {
    throw new Error("SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM must all be set.");
  }
  if (!Number.isInteger(Number(SMTP_PORT)) || Number(SMTP_PORT) < 1 || Number(SMTP_PORT) > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port.");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return { transporter, from: SMTP_FROM };
}

async function sendGuestEmail({ to, subject, text }) {
  const config = getTransporter();
  if (!config) {
    return { status: "not_configured" };
  }

  const info = await config.transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
  });
  return { status: "sent", messageId: info.messageId };
}

module.exports = { sendGuestEmail };
