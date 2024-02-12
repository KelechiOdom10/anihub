export const APP_TITLE = "Anihub";
export const DATABASE_PREFIX = "anihub";
export const EMAIL_SENDER = '"Anihub" <noreply@anihub.com>';

export const redirects = {
  toLogin: "/login",
  toSignup: "/signup",
  afterLogin: "/",
  afterLogout: "/",
  toVerify: "/verify-email",
  afterVerify: "/",
} as const;
