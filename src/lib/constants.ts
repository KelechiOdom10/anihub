import { type DefaultOptions } from "@tanstack/react-query";

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

export const QUERY_OPTIONS_DEFAULT: DefaultOptions["queries"] = {
  retry: false,
  staleTime: 15 * 60 * 1000, // 15 minutes
  enabled: true,
  refetchInterval: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
};
