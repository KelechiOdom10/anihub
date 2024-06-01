import { redirect } from "next/navigation";
import { Signup } from "./signup";
import { validateRequest } from "~/lib/auth/validate-request";
import { redirects } from "~/lib/constants";

export const metadata = {
  title: "Sign Up",
  description: "Signup Page",
};

export default async function SignupPage() {
  const { user } = await validateRequest();

  if (user) redirect(redirects.afterLogin);

  return <Signup />;
}
