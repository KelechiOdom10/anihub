import { Suspense, type ReactNode } from "react";

import { AuthLoading } from "./_components/auth-loading";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Suspense fallback={<AuthLoading />}>{children}</Suspense>
    </div>
  );
};

export default AuthLayout;
