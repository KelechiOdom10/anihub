import { type Metadata } from "next";
import { type ReactNode } from "react";

import { Footer } from "~/components/layout/footer";
import { Header } from "~/components/layout/header";
import { APP_TITLE } from "~/lib/constants";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Discover and share your taste in anime",
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
