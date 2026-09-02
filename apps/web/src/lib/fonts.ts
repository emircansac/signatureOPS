import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["500"],
  display: "swap",
  variable: "--font-fraunces",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-sans",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  variable: "--font-plex-mono",
});
