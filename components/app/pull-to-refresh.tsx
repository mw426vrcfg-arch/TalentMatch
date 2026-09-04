"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useT } from "@/components/i18n/i18n-provider";

const TRIGGER_DISTANCE = 72;
const MAX_DISTANCE = 108;
const RESISTANCE = 0.55;
const MIN_VISIBLE_MS = 620;

const BARS = [0, 1, 2, 3, 4, 5, 6, 7];

function Spinner({ progress, spinning }: { progress: number; spinning: boolean }) {
  return (
    <span
      className={`relative block h-[18px] w-[18px] ${spinning ? "animate-ptr" : ""}`}
      style={spinning ? undefined : { transform: `rotate(${Math.round(progress * 8) * 45}deg)` }}
    >
      {BARS.map((bar) => (
        <span
          key={bar}
          className="absolute left-1/2 top-1/2 h-[6px] w-[2px] rounded-full bg-ink"
          style={{
            marginLeft: "-1px",
            marginTop: "-3px",
            transform: `rotate(${bar * 45}deg) translateY(-6px)`,
            opacity: spinning ? 0.12 + (bar / 7) * 0.68 : progress * 8 > bar ? 0.75 : 0.12,
          }}
        />
      ))}
    </span>
  );
}

export function PullToRefresh() {
  const t = useT();
  const router = useRouter();
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isPending, startTransition] = useTransition();

  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const busyRef = useRef(false);
  const startedAt = useRef(0);

  const reset = useCallback(() => {
    startY.current = null;
    distanceRef.current = 0;
    setDistance(0);
    setDragging(false);
  }, []);

  const trigger = useCallback(() => {
    busyRef.current = true;
    startedAt.current = Date.now();
    distanceRef.current = TRIGGER_DISTANCE;
    setDistance(TRIGGER_DISTANCE);
    setDragging(false);
    setBusy(true);
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    document.documentElement.classList.add("ptr-lock");
    return () => document.documentElement.classList.remove("ptr-lock");
  }, []);

  useEffect(() => {
    function onStart(event: TouchEvent) {
      if (busyRef.current || window.scrollY > 0 || event.touches.length !== 1) {
        return;
      }
      const target = event.target as Element | null;
      if (target?.closest?.("[data-ptr-ignore]")) {
        return;
      }
      startY.current = event.touches[0].clientY;
    }

    function onMove(event: TouchEvent) {
      if (startY.current === null) {
        return;
      }

      const delta = event.touches[0].clientY - startY.current;

      if (delta <= 0 || window.scrollY > 0) {
        reset();
        return;
      }

      // Nur greifen, wenn wirklich gezogen wird — sonst bleibt normales Scrollen möglich.
      event.preventDefault();
      const next = Math.min(MAX_DISTANCE, delta * RESISTANCE);
      distanceRef.current = next;
      setDistance(next);
      setDragging(true);
    }

    function onEnd() {
      if (startY.current === null) {
        return;
      }
      const pulled = distanceRef.current;
      startY.current = null;

      if (pulled >= TRIGGER_DISTANCE) {
        trigger();
        return;
      }
      reset();
    }

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);

    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [reset, trigger]);

  useEffect(() => {
    if (!busy || isPending) {
      return;
    }

    const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current));
    const timer = setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
      reset();
    }, remaining);

    return () => clearTimeout(timer);
  }, [busy, isPending, reset]);

  const progress = Math.min(1, distance / TRIGGER_DISTANCE);
  const active = busy || distance > 0;

  return (
    <div
      aria-hidden={!busy}
      className="pointer-events-none fixed inset-x-0 top-14 z-30 flex justify-center"
      style={{
        transform: `translateY(${busy ? 8 : distance * 0.28}px)`,
        transition: dragging ? "none" : "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <span
        role="status"
        aria-label={busy ? t("common.refreshing") : undefined}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/80 shadow-[0_10px_28px_rgba(15,15,20,0.12)] backdrop-blur-xl"
        style={{
          opacity: active ? Math.max(busy ? 1 : 0.25, progress) : 0,
          transform: `scale(${active ? 0.7 + progress * 0.3 : 0.7})`,
          transition: "opacity 220ms ease-out, transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Spinner progress={progress} spinning={busy} />
      </span>
    </div>
  );
}
