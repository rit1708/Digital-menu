import { Resend } from "resend";
import { env } from "~/env.mjs";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendVerificationCodeEmail(email: string, code: string, sendVerificationCode: boolean = true) {
  if (!sendVerificationCode) {
    console.log(`Verification code for ${email}: ${code}`);
    return { success: true, message: "Verification code sent", code: code };
  }

  // Determine FROM email address
  const fromEmail = env.RESEND_FROM_EMAIL || "Digital Menu <onboarding@resend.dev>";

  // Check if Resend is configured, if not just log the code
  if (!resend || !env.RESEND_API_KEY) {
    console.log(`Verification code for ${email}: ${code}`);
    return { success: true, message: "Verification code sent", code: code };
  }

  try {
    const response = await resend?.emails.send({
      from: fromEmail,
      to: email,
      subject: "Your Verification Code - Digital Menu",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Digital Menu Management</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
              <p>Use the following code to verify your email and access your account:</p>
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace;">
                  ${code}
                </div>
              </div>
              <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                <p>This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("🚀 ~ sendVerificationCodeEmail ~ response:", {
      data: response.data,
      error: response.error
    });
    return { success: true, message: "Verification code sent", code: code };
  } catch (error) {
    console.error("Error sending verification code email:", error);
    // Fallback: log the code if email fails
    console.log(`[FALLBACK] Verification code for ${email}: ${code}`);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

