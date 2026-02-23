import { ActionOptions, save } from "gadget-server";
import { preventCrossUserDataAccess } from "gadget-server/auth";
import { randomBytes, createHash } from "crypto";

export const run: ActionRun = async ({ params, record, logger, api, emails, currentAppUrl, session }) => {
  const roleKeys = Array.isArray(session?.roles)
    ? session.roles
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  if (!isAdmin) {
    await preventCrossUserDataAccess(params, record);
  }
  
  // Generate a random verification code
  const code = randomBytes(32).toString('hex');
  
  // Hash the code for storage
  const hashedToken = createHash('sha256').update(code).digest('hex');
  
  // Set the token and expiry on the record
  record.emailVerificationToken = hashedToken;
  record.emailVerificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Save the record
  await save(record);
  
  // Create the verification link with the unhashed code
  const verificationLink = `${currentAppUrl}/verify-email?code=${code}`;
  
  // Send the verification email
  await emails.sendMail({
    to: record.email,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up! Please verify your email address by clicking the link below:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 24 hours.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    `,
    text: `
      Verify Your Email Address
      
      Thank you for signing up! Please verify your email address by clicking the link below:
      
      ${verificationLink}
      
      This link will expire in 24 hours.
      
      If you didn't request this email, you can safely ignore it.
    `,
  });
  
  logger.info({ userId: record.id, email: record.email }, "Verification email sent successfully");
};

export const options: ActionOptions = {
  actionType: "custom",
  triggers: {
    api: true,
  },
};
