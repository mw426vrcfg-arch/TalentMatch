"use client";

import { AppTabBar, type AppTabItem } from "@/components/app/app-tab-bar";
import { useT } from "@/components/i18n/i18n-provider";

const iconClass = "h-[22px] w-[22px]";

function HomeIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function HeartIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
    </svg>
  );
}

function ClipboardIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h.01M16 5h.01M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Zm-2 3h10v14H7V6Z" />
    </svg>
  );
}

function UserIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.2" />
      <path strokeLinecap="round" d="M5.5 19.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </svg>
  );
}

function GridIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function InboxIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4l1.5 2h5L16 13h4v6H4v-6Zm0 0 2.5-8h11L20 13" />
    </svg>
  );
}

function PlusIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={active ? "2" : "1.7"}>
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ShopIcon(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" className={iconClass} fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16l-1 11H5L4 9Zm3-4h10l1 4H6l1-4Z" />
    </svg>
  );
}

export function CustomerTabBar() {
  const t = useT();
  const items: AppTabItem[] = [
    { href: "/dashboard", label: t("nav.home"), icon: HomeIcon },
    { href: "/dashboard/favorites", label: t("nav.favorites"), icon: HeartIcon },
    { href: "/dashboard/applications", label: t("nav.applications"), icon: ClipboardIcon },
    { href: "/dashboard/profile", label: t("nav.profile"), icon: UserIcon },
  ];
  return <AppTabBar items={items} />;
}

export function SalonTabBar({ pendingCount = 0 }: { pendingCount?: number }) {
  const t = useT();
  const items: AppTabItem[] = [
    { href: "/business/dashboard", label: t("nav.dashboard"), icon: GridIcon },
    {
      href: "/business/applications",
      label: t("nav.applications"),
      badge: pendingCount,
      icon: InboxIcon,
    },
    { href: "/business/offers", label: t("nav.offers"), icon: PlusIcon },
    { href: "/business/profile", label: t("nav.profile"), match: ["/business/profile"], icon: ShopIcon },
  ];
  return <AppTabBar items={items} />;
}
