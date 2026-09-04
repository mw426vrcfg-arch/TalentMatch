"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";

const STORAGE_KEY = "tm_onboarding_v1";

type Slide = {
  kicker: MessageKey;
  title: MessageKey;
  body: MessageKey;
  icon: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    kicker: "onboarding.exclusive",
    title: "onboarding.exclusiveTitle",
    body: "onboarding.exclusiveBody",
    icon: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5 14.4 8l6 .5-4.6 3.9 1.4 5.9L12 15.2 6.8 18.3l1.4-5.9L3.6 8.5l6-.5z" />
      </svg>
    ),
  },
  {
    kicker: "onboarding.discreet",
    title: "onboarding.discreetTitle",
    body: "onboarding.discreetBody",
    icon: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 8.5a2 2 0 0 1 2-2h2l1.3-2h6.4l1.3 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
        <circle cx="12" cy="13" r="3.4" />
      </svg>
    ),
  },
  {
    kicker: "onboarding.binding",
    title: "onboarding.bindingTitle",
    body: "onboarding.bindingBody",
    icon: (
      <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6z" />
        <path d="m9.2 12.2 2 2 3.6-4" />
      </svg>
    ),
  },
];

export function WelcomeSlider() {
  const t = useT();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // Privater Modus ohne Storage: Onboarding einmal pro Besuch zeigen.
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const scrollTo = useCallback((next: number) => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }, []);

  const remember = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ohne Storage bleibt es bei der Anzeige pro Besuch.
    }
  }, []);

  const dismiss = useCallback(() => {
    remember();
    setVisible(false);
  }, [remember]);

  // Overlay bleibt bis zum Seitenwechsel stehen, sonst blitzt die Startseite auf.
  const start = useCallback(() => {
    remember();
    router.push("/login");
  }, [remember, router]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        scrollTo(Math.min(index + 1, SLIDES.length - 1));
      }
      if (event.key === "ArrowLeft") {
        scrollTo(Math.max(index - 1, 0));
      }
      if (event.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, index, scrollTo, dismiss]);

  if (!visible) {
    return null;
  }

  const isLast = index === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.aria")}
      className="animate-app fixed inset-0 z-50 flex flex-col bg-[linear-gradient(180deg,#eef0f4_0%,#e2e5ec_100%)]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-14%] h-[26rem] w-[26rem] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute right-[-12%] top-[10%] h-[20rem] w-[20rem] rounded-full bg-slate-300/40 blur-3xl" />
        <div className="absolute bottom-[-16%] left-1/4 h-[22rem] w-[32rem] rounded-full bg-slate-400/20 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 pt-7 sm:px-10">
        <p className="font-serif text-2xl tracking-tight text-ink">TalentMatch</p>
        <button
          type="button"
          onClick={dismiss}
          className="ui-btn-secondary px-3 text-xs"
        >
          {t("onboarding.skip")}
        </button>
      </header>

      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          const next = Math.round(track.scrollLeft / track.clientWidth);
          if (next !== index) {
            setIndex(next);
          }
        }}
        className="ui-swipe-track relative z-10 flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {SLIDES.map((slide, slideIndex) => (
          <section
            key={slide.kicker}
            aria-label={t("onboarding.step", { n: slideIndex + 1, total: SLIDES.length })}
            className="flex w-full shrink-0 snap-center flex-col items-center justify-center px-8 text-center sm:px-12"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/40 bg-white/70 text-ink shadow-[0_20px_50px_rgba(15,15,20,0.09)] backdrop-blur-xl sm:h-28 sm:w-28">
              <span className="block h-11 w-11 sm:h-12 sm:w-12">{slide.icon}</span>
            </div>
            <p className="ui-kicker mt-9">{t(slide.kicker)}</p>
            <h2 className="mt-4 max-w-md font-serif text-[2.1rem] leading-[1.12] tracking-[-0.02em] text-ink sm:text-5xl">
              {t(slide.title)}
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-soft sm:max-w-md sm:text-base">
              {t(slide.body)}
            </p>
          </section>
        ))}
      </div>

      <footer className="relative z-10 px-8 pb-10 sm:px-12 sm:pb-12">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-7">
          <div className="flex items-center gap-2">
            {SLIDES.map((slide, dotIndex) => (
              <button
                key={slide.kicker}
                type="button"
                onClick={() => scrollTo(dotIndex)}
                aria-label={t("onboarding.toStep", { n: dotIndex + 1 })}
                aria-current={dotIndex === index ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  dotIndex === index ? "w-7 bg-ink" : "w-1.5 bg-ink/20 hover:bg-ink/40"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={isLast ? start : () => scrollTo(index + 1)}
            className="ui-btn-primary w-full"
          >
            {isLast ? t("onboarding.start") : t("onboarding.next")}
          </button>

          <p className="text-xs text-ink-soft">{t("onboarding.swipe")}</p>
        </div>
      </footer>
    </div>
  );
}
