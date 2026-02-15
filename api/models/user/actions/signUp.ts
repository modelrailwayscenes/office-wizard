import { applyParams, save, ActionOptions } from "gadget-server";
import { randomBytes, createHash } from "crypto";

export const run: ActionRun = async ({ params, record, api, emails, currentAppUrl }) => {
  applyParams(params, record);
  record.emailVerified = false;
  await save(record);
  
  // Generate verification code and token
  const code = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(code).digest('hex');
  
  // Set token and expiry on the record
  record.emailVerificationToken = hashedToken;
  record.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  // Save the record again to persist the token
  await save(record);
  
  // Create verification link
  const verificationLink = `${currentAppUrl}verify-email?code=${code}`;
  
  // Send verification email
  await emails.sendMail({
    to: record.email,
    subject: "Verify your email",
    html: `
      <p>Thank you for signing up!</p>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>This link will expire in 24 hours.</p>
    `,
  });
  
  return record;
};

export const options: ActionOptions = {
  actionType: "create",
  returnType: true,
  triggers: {
    emailSignUp: true,
  },
};
