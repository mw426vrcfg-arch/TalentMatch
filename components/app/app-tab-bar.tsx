"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type AppTabItem = {
  href: string;
  label: string;
  match?: string[];
  badge?: number;
  icon: (active: boolean) => ReactNode;
};

function isActive(pathname: string, item: AppTabItem) {
  if (pathname === item.href) {
    return true;
  }
  return (item.match ?? []).some((prefix) => pathname.startsWith(prefix));
}

export function AppTabBar({ items }: { items: AppTabItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="ui-tabbar pb-[env(safe-area-inset-bottom)]"
      aria-label="App"
    >
      <ul className="mx-auto grid max-w-lg grid-flow-col auto-cols-fr px-2 pt-1.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex cursor-pointer flex-col items-center gap-0.5 px-1 py-2 transition-all duration-300 ease-out hover:scale-[1.015] active:scale-95 ${
                  active
                    ? "font-medium text-neutral-900"
                    : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <span className="relative">
                  {item.icon(active)}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate text-[10px] tracking-wide">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
