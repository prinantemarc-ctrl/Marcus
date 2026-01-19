"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { GenerationProvider } from "@/lib/core/generationContext";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <GenerationProvider>
        {children}
      </GenerationProvider>
    </SessionProvider>
  );
}
