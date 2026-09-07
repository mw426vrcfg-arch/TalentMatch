"use client";

import { track } from "@vercel/analytics/react";
import posthog from "posthog-js";

export const ANALYTICS_EVENTS = {
  userSignedUp: "user_signed_up",
  viewOffer: "view_offer",
  requestAppointment: "request_appointment",
} as const;

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, properties?: AnalyticsProps) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    track(name, properties);
  } catch {
    // Vercel Analytics darf die UI nicht blockieren.
  }

  try {
    posthog.capture(name, properties);
  } catch {
    // PostHog darf die UI nicht blockieren.
  }
}
