import { env } from "~/env";
import { EMAIL_SENDER } from "~/lib/constants";

export type MessageInfo = {
  to: string;
  subject: string;
  body: string;
};

export const sendMail = async (message: MessageInfo) => {
  const { to, subject, body } = message;
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: EMAIL_SENDER },
        subject: subject,
        content: [
          {
            type: "text/html",
            value: body,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `SendGrid API error: ${response.status} ${response.statusText}`
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
