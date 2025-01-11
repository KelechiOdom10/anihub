"use server";

/* eslint @typescript-eslint/no-explicit-any:0, @typescript-eslint/prefer-optional-chain:0 */

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { isWithinExpirationDate, TimeSpan, createDate } from "oslo";
import { generateRandomString, alphabet } from "oslo/crypto";
import { z } from "zod";

import { hashPassword, verifyPassword } from "./password";
import { deleteSessionTokenCookie, setSession } from "./session";

import { redirects } from "../constants";

import {
  generateIdFromEntropySize,
  invalidateSession,
  invalidateUserSessions,
} from ".";

import { env } from "~/env";
import { validateRequest } from "~/lib/auth/validate-request";
import { renderVerificationCodeEmail } from "~/lib/email-templates/email-verification";
import { renderResetPasswordEmail } from "~/lib/email-templates/reset-password";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
  resetPasswordSchema,
} from "~/lib/validators/auth";
import { db } from "~/server/db";
import {
  emailVerificationCodes,
  passwordResetTokens,
  users,
} from "~/server/db/schema";
import { sendMail } from "~/server/send-mail";

export interface ActionResponse<T> {
  fieldError?: Partial<Record<keyof T, string | undefined>>;
  formError?: string;
}

export async function login(
  _: any,
  formData: FormData
): Promise<ActionResponse<LoginInput>> {
  const obj = Object.fromEntries(formData.entries());
  const redirectUrl = obj.redirect as string | undefined;

  const parsed = loginSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      fieldError: {
        email: err.fieldErrors.email?.[0],
        password: err.fieldErrors.password?.[0],
      },
    };
  }

  const { email, password } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.email, email),
  });

  if (!existingUser) {
    return {
      formError: "Incorrect email or password",
    };
  }

  if (!existingUser || !existingUser?.hashedPassword) {
    return {
      formError: "Incorrect email or password",
    };
  }

  const validPassword = await verifyPassword(
    existingUser.hashedPassword,
    password
  );

  if (!validPassword) {
    return {
      formError: "Incorrect email or password",
    };
  }

  await setSession(existingUser.id);

  if (redirectUrl) {
    return redirect(redirectUrl);
  }

  return redirect(redirects.afterLogin);
}

export async function signup(
  _: any,
  formData: FormData
): Promise<ActionResponse<SignupInput>> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = signupSchema.safeParse(obj);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      fieldError: {
        email: err.fieldErrors.email?.[0],
        username: err.fieldErrors.username?.[0],
        password: err.fieldErrors.password?.[0],
      },
    };
  }

  const { email, password, username } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    where: (table, { or, eq }) =>
      or(eq(table.email, email), eq(table.username, username)),
    columns: {
      email: true,
      username: true,
    },
  });

  if (existingUser) {
    return {
      formError:
        existingUser.email === email
          ? "An account with this email already exists"
          : "This username is already taken",
    };
  }

  const hashedPassword = await hashPassword(password);

  const user = await db
    .insert(users)
    .values({
      email,
      username,
      hashedPassword,
    })
    .returning();

  if (!user[0]) {
    return {
      formError: "Failed to create account",
    };
  }

  // const verificationCode = await generateEmailVerificationCode(userId, email);
  // await sendMail({
  //   to: email,
  //   subject: "Verify your account",
  //   body: renderVerificationCodeEmail({ code: verificationCode }),
  // });

  await setSession(user[0]?.id);

  return redirect(redirects.toVerify);
}

export async function logout(
  redirectUrl?: string
): Promise<{ error: string } | void> {
  const { session } = await validateRequest();
  if (!session) {
    return {
      error: "No session found",
    };
  }
  await invalidateSession(session.id);
  deleteSessionTokenCookie();
  if (redirectUrl) {
    return redirect(redirectUrl);
  }
}

export async function resendVerificationEmail(): Promise<{
  error?: string;
  success?: boolean;
}> {
  const { user } = await validateRequest();
  if (!user) {
    return redirect(redirects.toLogin);
  }
  const lastSent = await db.query.emailVerificationCodes.findFirst({
    where: (table, { eq }) => eq(table.userId, user.id),
    columns: { expiresAt: true },
  });

  if (lastSent && isWithinExpirationDate(lastSent.expiresAt)) {
    return {
      error: `Please wait ${timeFromNow(lastSent.expiresAt)} before resending`,
    };
  }
  const verificationCode = await generateEmailVerificationCode(
    user.id,
    user.email
  );
  await sendMail({
    to: user.email,
    subject: "Verify your account",
    body: renderVerificationCodeEmail({ code: verificationCode }),
  });

  return { success: true };
}

export async function verifyEmail(
  _: any,
  formData: FormData
): Promise<{ error: string } | void> {
  const code = formData.get("code");
  if (typeof code !== "string" || code.length !== 8) {
    return { error: "Invalid code" };
  }
  const { user } = await validateRequest();
  if (!user) {
    return redirect(redirects.toLogin);
  }

  const dbCode = await db.transaction(async (tx) => {
    const item = await tx.query.emailVerificationCodes.findFirst({
      where: (table, { eq }) => eq(table.userId, user.id),
    });
    if (item) {
      await tx
        .delete(emailVerificationCodes)
        .where(eq(emailVerificationCodes.id, item.id));
    }
    return item;
  });

  if (!dbCode || dbCode.code !== code)
    return { error: "Invalid verification code" };

  if (!isWithinExpirationDate(dbCode.expiresAt))
    return { error: "Verification code expired" };

  if (dbCode.email !== user.email) return { error: "Email does not match" };

  await invalidateUserSessions(user.id);
  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, user.id));

  await setSession(user.id);

  redirect(redirects.afterLogin);
}

export async function sendPasswordResetLink(
  _: any,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email");
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) {
    return { error: "Provided email is invalid." };
  }
  try {
    const user = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, parsed.data),
    });

    if (!user || !user.emailVerified)
      return { error: "Provided email is invalid." };

    const verificationToken = await generatePasswordResetToken(user.id);

    const verificationLink = `${env.NEXT_PUBLIC_APP_URL}/reset-password/${verificationToken}`;

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      body: renderResetPasswordEmail({ link: verificationLink }),
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to send verification email." };
  }
}

export async function resetPassword(
  _: any,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const obj = Object.fromEntries(formData.entries());

  const parsed = resetPasswordSchema.safeParse(obj);

  if (!parsed.success) {
    const err = parsed.error.flatten();
    return {
      error: err.fieldErrors.password?.[0] ?? err.fieldErrors.token?.[0],
    };
  }
  const { token, password } = parsed.data;

  const dbToken = await db.transaction(async (tx) => {
    const item = await tx.query.passwordResetTokens.findFirst({
      where: (table, { eq }) => eq(table.id, token),
    });
    if (item) {
      await tx
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.id, item.id));
    }
    return item;
  });

  if (!dbToken) return { error: "Invalid password reset link" };

  if (!isWithinExpirationDate(dbToken.expiresAt))
    return { error: "Password reset link expired." };

  await invalidateUserSessions(dbToken.userId);
  const hashedPassword = await hashPassword(password);

  await db
    .update(users)
    .set({ hashedPassword })
    .where(eq(users.id, dbToken.userId));

  await setSession(dbToken.userId);

  redirect(redirects.afterLogin);
}

const timeFromNow = (time: Date) => {
  const now = new Date();
  const diff = time.getTime() - now.getTime();
  const minutes = Math.floor(diff / 1000 / 60);
  const seconds = Math.floor(diff / 1000) % 60;
  return `${minutes}m ${seconds}s`;
};

async function generateEmailVerificationCode(
  userId: number,
  email: string
): Promise<string> {
  await db
    .delete(emailVerificationCodes)
    .where(eq(emailVerificationCodes.userId, userId));
  const code = generateRandomString(8, alphabet("0-9")); // 8 digit code
  await db.insert(emailVerificationCodes).values({
    userId,
    email,
    code,
    expiresAt: createDate(new TimeSpan(10, "m")), // 10 minutes
  });
  return code;
}

async function generatePasswordResetToken(userId: number): Promise<string> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId));
  const tokenId = generateIdFromEntropySize(40);
  await db.insert(passwordResetTokens).values({
    id: tokenId,
    userId,
    expiresAt: createDate(new TimeSpan(2, "h")),
  });
  return tokenId;
}
