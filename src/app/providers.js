"use client";

import { Toaster } from "@/components/ui/sonner.js";

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
