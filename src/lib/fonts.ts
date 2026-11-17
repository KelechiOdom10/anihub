import "~/styles/globals.css";

import localFont from "next/font/local";

export const fontSans = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
});
