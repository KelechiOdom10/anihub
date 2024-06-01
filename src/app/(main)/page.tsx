import { type Metadata } from "next";

import { Hero } from "./_components/hero";

export const metadata: Metadata = {
  title: "Next.js Lucia Auth Starter Template",
  description:
    "A Next.js starter template with nextjs and Lucia auth. Includes drizzle, trpc, react-email, tailwindcss and shadcn-ui",
};

const HomePage = () => {
  return (
    <>
      <Hero />
    </>
  );
};

export default HomePage;
