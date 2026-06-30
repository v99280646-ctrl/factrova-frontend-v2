"use client";

import dynamic from "next/dynamic";

export function clientPage(loader) {
  return dynamic(loader, { ssr: false });
}
