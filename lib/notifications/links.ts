import { type NotificationRow } from "@/lib/notifications/rows";
import { type UserRole } from "@/lib/supabase/env";

function isSalonRole(role: UserRole | string) {
  return role === "business" || role === "admin";
}

function isNewApplicationNotice(item: NotificationRow) {
  return (
    item.type === "application_received" ||
    /neue bewerbung/i.test(`${item.title} ${item.message}`)
  );
}

function isAcceptedNotice(item: NotificationRow) {
  if (item.type === "application_rejected" || item.type === "booking_cancelled") {
    return false;
  }

  return (
    item.type === "application_accepted" ||
    item.type === "swap_accepted" ||
    /angenommen|bestätigt/i.test(`${item.title} ${item.message}`)
  );
}

export function hrefForNotification(item: NotificationRow, role: UserRole | string) {
  const applicationId = item.application_id;
  const offerId = item.offer_id;

  if (isSalonRole(role)) {
    if (isNewApplicationNotice(item)) {
      return applicationId
        ? `/business/applications?focus=${encodeURIComponent(applicationId)}`
        : "/business/applications";
    }
    if (item.type === "swap_requested") {
      return "/business/dashboard";
    }
    return "/business/applications";
  }

  if (isAcceptedNotice(item)) {
    return applicationId
      ? `/dashboard/applications?appointment=${encodeURIComponent(applicationId)}&chat=1`
      : "/dashboard/applications";
  }

  if (item.type === "offer_published" && offerId) {
    return `/offers/${offerId}`;
  }

  return "/dashboard/applications";
}
