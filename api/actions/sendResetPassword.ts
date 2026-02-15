import { ActionOptions } from "gadget-server";
import { randomBytes } from "crypto";

export const run: ActionRun = async ({ params, logger, api, emails, currentAppUrl }) => {
  const email = params.email;
  
  // Find user by email (use maybeFindFirst to not throw if not found)
  const user = await api.user.maybeFindFirst({
    filter: { email: { equals: email } }
  });
  
  if (user) {
    // Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');
    
    // Calculate expiry (1 hour from now)
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);
    
    // Update user with token and expiry
    await api.user.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordTokenExpiry: expiryDate
    });
    
    // Construct reset link
    const resetLink = `${currentAppUrl}/reset-password?token=${resetToken}`;
    
    // Send email with password reset link
    if (params.email) {
      await emails.sendMail({
        to: params.email,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
    }
  }
  
  // Always succeed for security (don't reveal if user exists)
  return { success: true };
};

export const params = {
  email: { type: "string" }
};

export const options: ActionOptions = {
  returnType: true,
  triggers: {
    api: true
  }
};
