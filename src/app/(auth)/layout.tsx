import { headers } from "next/headers";
import { Suspense, type ReactNode } from "react";

import { AuthLoading } from "./_components/auth-loading";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  const headerList = headers();
  const pathname = headerList.get("x-current-path");

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Suspense
        fallback={
          <AuthLoading page={pathname === "/signup" ? "signup" : "login"} />
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

export default AuthLayout;
