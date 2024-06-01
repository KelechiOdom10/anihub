import { APP_TITLE } from "~/lib/constants";
import { Header } from "~/components/layout/header";
import { Footer } from "~/components/layout/footer";

import { type ReactNode } from "react";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "A Next.js starter with T3 stack and Lucia auth.",
};

function LandingPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[100vh]">{children}</main>
      <Footer />
    </>
  );
}

export default LandingPageLayout;
