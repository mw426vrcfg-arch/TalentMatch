"use client";

export const CHIP_BASE =
  "inline-flex cursor-pointer select-none items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ease-out hover:scale-[1.015] active:scale-95";

export const CHIP_IDLE = `${CHIP_BASE} border border-neutral-200/60 bg-white/60 text-neutral-600 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md hover:bg-white/90`;

export const CHIP_ACTIVE = `${CHIP_BASE} border border-neutral-800 bg-neutral-900 text-white shadow-md hover:bg-neutral-800`;

export function choiceChipClass(active: boolean) {
  return active ? CHIP_ACTIVE : CHIP_IDLE;
}
