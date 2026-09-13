"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCProvider } from "@/lib/trpc";
import type { ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <TRPCProvider>{children}</TRPCProvider>
    </SessionProvider>
  );
}
