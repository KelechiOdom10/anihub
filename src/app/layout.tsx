import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";

import { AuthProvider } from "~/components/providers/auth-provider";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { UrqlReactProvider as UrqlProvider } from "~/graphql/react";
import { getUser } from "~/lib/auth/validate-request";
import { APP_TITLE } from "~/lib/constants";
import { fontSans } from "~/lib/fonts";
import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: `%s | ${APP_TITLE}`,
  },
  description: "Anihub - Social anime discovery",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userPromise = getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <UrqlProvider>
            <AuthProvider userPromise={userPromise}>{children}</AuthProvider>
          </UrqlProvider>
          <Toaster position="top-right" />
          <NextTopLoader color="#ffffff" showSpinner={false} />
        </ThemeProvider>
      </body>
    </html>
  );
}
