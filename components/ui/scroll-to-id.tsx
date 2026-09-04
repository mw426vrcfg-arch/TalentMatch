"use client";

import { useEffect } from "react";

export function ScrollToId({ id }: { id?: string | null }) {
  useEffect(() => {
    if (!id) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [id]);

  return null;
}
