import { redirect } from "next/navigation";

import { Login } from "./login";

import { validateRequest } from "~/lib/auth/validate-request";
import { redirects } from "~/lib/constants";

export const metadata = {
  title: "Login",
  description: "Login Page",
};

export default async function LoginPage() {
  const { user } = await validateRequest();

  if (user) redirect(redirects.afterLogin);

  return <Login />;
}
