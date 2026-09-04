"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { sendFeedbackAction } from "@/app/actions/send-feedback";
import { signOutAction } from "@/app/auth/actions";
import {
  updateGenderAction,
  updatePushPreferenceAction,
} from "@/app/dashboard/profile/settings-actions";
import { type GenderValue } from "@/lib/profile/gender";
import { updateSalonPushPreferenceAction } from "@/app/business/profile/settings-actions";
import { Chevron, FeedbackToast, Sheet } from "@/components/settings/apple-sheet";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocalize, useT } from "@/components/i18n/i18n-provider";
import { type MessageKey } from "@/lib/i18n/messages";
import { hapticTap } from "@/lib/ui/haptic";
import { readPushEnabled, writePushEnabled } from "@/lib/notifications/push-pref";

const LEGAL: { href: string; key: MessageKey }[] = [
  { href: "/impressum", key: "settings.impressum" },
  { href: "/agb", key: "settings.terms" },
  { href: "/datenschutz", key: "settings.privacy" },
];

const GENDERS: { value: Exclude<GenderValue, "">; key: MessageKey }[] = [
  { value: "female", key: "settings.genderFemale" },
  { value: "male", key: "settings.genderMale" },
  { value: "diverse", key: "settings.genderDiverse" },
];

const CUSTOMER_HELP: { title: MessageKey; body: MessageKey }[] = [
  { title: "settings.helpRulesTitle", body: "settings.helpRulesBody" },
  { title: "settings.helpStrikesTitle", body: "settings.helpStrikesBody" },
];

const FEEDBACK_TOAST_KEY = "tm-feedback-thanks";

const SALON_HELP: { title: MessageKey; body: MessageKey }[] = [
  { title: "settings.salonHelpBookingsTitle", body: "settings.salonHelpBookingsBody" },
  { title: "settings.salonHelpNoshowTitle", body: "settings.salonHelpNoshowBody" },
  { title: "settings.salonHelpFeesTitle", body: "settings.salonHelpFeesBody" },
];

export function SettingsHub({
  gender,
  pushEnabled,
  variant = "customer",
}: {
  gender: GenderValue;
  pushEnabled: boolean;
  variant?: "customer" | "salon";
}) {
  const t = useT();
  const localize = useLocalize();
  const isSalon = variant === "salon";
  const [selectedGender, setSelectedGender] = useState<GenderValue>(gender);
  const [pushOn, setPushOn] = useState(pushEnabled);
  const [helpOpen, setHelpOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [toastMessage, setToastMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedbackClosing, setFeedbackClosing] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [, startGender] = useTransition();
  const [, startPush] = useTransition();
  const sending = isSending || feedbackClosing;
  const helpItems = isSalon ? SALON_HELP : CUSTOMER_HELP;

  useEffect(() => {
    setSelectedGender(gender);
  }, [gender]);

  useEffect(() => {
    const stored = readPushEnabled();
    setPushOn(pushEnabled && stored);
  }, [pushEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.sessionStorage.getItem(FEEDBACK_TOAST_KEY)) {
      window.sessionStorage.removeItem(FEEDBACK_TOAST_KEY);
      setToastVariant("success");
      setToastMessage(t("settings.feedbackSent"));
      setToastOpen(true);
    }
  }, []);

  const closeToast = useCallback(() => {
    setToastOpen(false);
  }, []);

  async function sendFeedback(formData: FormData) {
    setToastOpen(false);
    setFeedbackError("");
    setIsSending(true);
    try {
      const result = await sendFeedbackAction(formData);
      if (!result.success) {
        const exact = result.error || t("settings.feedbackSaveError");
        setFeedbackError(exact);
        setToastMessage(exact);
        setToastVariant("error");
        setToastOpen(true);
        setIsSending(false);
        return;
      }
      setFeedbackMessage("");
      setFeedbackError("");
      setIsSending(false);
      setFeedbackClosing(true);
      window.sessionStorage.setItem(FEEDBACK_TOAST_KEY, "1");
      setToastMessage(t("settings.feedbackSent"));
      setToastVariant("success");
      setToastOpen(true);
      window.setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackClosing(false);
      }, 240);
    } catch (error) {
      const exact = error instanceof Error ? error.message : t("settings.feedbackSaveError");
      setFeedbackError(exact);
      setToastMessage(exact);
      setToastVariant("error");
      setToastOpen(true);
      setIsSending(false);
    }
  }

  return (
    <section className="mt-10 space-y-8 pb-2">
      {toastOpen ? (
        <FeedbackToast
          key={toastVariant}
          variant={toastVariant}
          message={toastMessage || (toastVariant === "error" ? t("settings.feedbackSaveError") : t("settings.feedbackSent"))}
          onClose={closeToast}
        />
      ) : null}

      <div>
        <p className="ui-kicker px-1">{t(isSalon ? "settings.businessGroup" : "settings.accountGroup")}</p>
        <div className="ui-settings-card mt-3 divide-y divide-neutral-200/40">
          {isSalon ? null : (
            <div className="px-4 py-3.5">
              <p className="text-[13px] text-ink-soft">{t("settings.language")}</p>
              <div className="mt-2 max-w-[220px]">
                <LanguageSwitcher compact />
              </div>
            </div>
          )}
          {isSalon ? null : (
          <div className="px-4 py-3.5">
            <p className="text-[13px] text-ink-soft">{t("settings.gender")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GENDERS.map((option) => {
                const active = selectedGender === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      hapticTap("light");
                      setSelectedGender(option.value);
                      const data = new FormData();
                      data.set("gender", option.value);
                      startGender(() => {
                        void updateGenderAction(data);
                      });
                    }}
                    className={active ? "ui-choice-active" : "ui-choice"}
                    aria-pressed={active}
                  >
                    {t(option.key)}
                  </button>
                );
              })}
            </div>
          </div>
          )}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[15px] text-ink">{t("settings.push")}</p>
              <p className="mt-0.5 text-[13px] text-ink-soft">{pushOn ? t("settings.pushOn") : t("settings.pushOff")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={pushOn}
              data-on={pushOn ? "true" : "false"}
              className="ui-ios-switch"
              onClick={() => {
                hapticTap("light");
                const next = !pushOn;
                setPushOn(next);
                writePushEnabled(next);
                startPush(() => {
                  void (isSalon ? updateSalonPushPreferenceAction(next) : updatePushPreferenceAction(next));
                });
              }}
            >
              <span className="ui-ios-switch-knob" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="ui-kicker px-1">{t("settings.legalGroup")}</p>
        <div className="ui-settings-card mt-3 divide-y divide-neutral-200/40">
          <button
            type="button"
            className="ui-settings-row"
            onClick={() => {
              hapticTap("light");
              setHelpOpen(true);
            }}
          >
            <span className="flex-1">{t(isSalon ? "settings.salonHelp" : "settings.help")}</span>
            <Chevron />
          </button>
          <button
            type="button"
            className="ui-settings-row"
            onClick={() => {
              hapticTap("light");
              setLegalOpen(true);
            }}
          >
            <span className="flex-1">{t("settings.legalDocs")}</span>
            <Chevron />
          </button>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <p className="ui-kicker px-1">{t("settings.growthGroup")}</p>
          <div className="ui-settings-card mt-3 divide-y divide-neutral-200/40">
            <button
              type="button"
              className="ui-settings-row"
              onClick={() => {
                hapticTap("light");
                setFeedbackError("");
                setFeedbackMessage("");
                setFeedbackOpen(true);
              }}
            >
              <span className="flex-1">{t("settings.feedback")}</span>
              <Chevron />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticTap("light");
            setSignOutOpen(true);
          }}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#FF3B30] px-5 text-[17px] font-medium text-white shadow-[0_8px_24px_rgba(255,59,48,0.28)] transition-all duration-300 ease-out hover:scale-[1.01] hover:bg-[#ff2d20] active:scale-95"
        >
          {t("auth.signOut")}
        </button>
      </div>

      {helpOpen ? (
        <Sheet title={t(isSalon ? "settings.salonHelpTitle" : "settings.helpTitle")} onClose={() => setHelpOpen(false)}>
          <p className="text-sm leading-relaxed text-ink-soft">
            {t(isSalon ? "settings.salonHelpIntro" : "settings.helpIntro")}
          </p>
          {helpItems.map((item) => (
            <div key={item.title}>
              <h3 className="mt-6 font-serif text-2xl text-ink">{t(item.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink">{t(item.body)}</p>
            </div>
          ))}
        </Sheet>
      ) : null}

      {legalOpen ? (
        <Sheet title={t("settings.legalDocs")} onClose={() => setLegalOpen(false)}>
          <div className="ui-settings-card divide-y divide-neutral-200/40">
            {LEGAL.map((link) => (
              <Link key={link.href} href={link.href} className="ui-settings-row">
                <span className="flex-1">{t(link.key)}</span>
                <Chevron />
              </Link>
            ))}
          </div>
        </Sheet>
      ) : null}

      {feedbackOpen ? (
        <Sheet
          title={t("settings.feedbackTitle")}
          closing={feedbackClosing}
          lockClose={sending}
          onClose={() => {
            if (sending) {
              return;
            }
            setFeedbackOpen(false);
          }}
        >
          <p className="text-sm leading-relaxed text-ink-soft">{t("settings.feedbackIntro")}</p>
          {feedbackError ? (
            <p className="ui-alert-error mt-4">{localize(feedbackError)}</p>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendFeedback(new FormData(event.currentTarget));
            }}
            className="mt-4 space-y-3"
            aria-busy={sending}
          >
            <textarea
              required
              name="message"
              rows={5}
              minLength={8}
              maxLength={2000}
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              readOnly={sending}
              aria-disabled={sending}
              placeholder={t("settings.feedbackPlaceholder")}
              className={`ui-input resize-y ${sending ? "pointer-events-none cursor-not-allowed opacity-60" : ""}`}
            />
            <button
              type="submit"
              disabled={sending}
              className="ui-btn-primary flex w-full items-center justify-center gap-2.5 transition-all duration-300 ease-out"
            >
              {sending ? (
                <>
                  <svg viewBox="0 0 24 24" className="ui-spin h-4 w-4" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  <span>{t("settings.feedbackSending")}</span>
                </>
              ) : (
                t("settings.feedbackSend")
              )}
            </button>
          </form>
        </Sheet>
      ) : null}

      {signOutOpen ? (
        <Sheet title={t("settings.signOutConfirmTitle")} onClose={() => setSignOutOpen(false)}>
          <p className="text-sm leading-relaxed text-ink">{t("settings.signOutConfirm")}</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" className="ui-btn-secondary w-full" onClick={() => setSignOutOpen(false)}>
              {t("settings.signOutCancel")}
            </button>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#FF3B30] px-5 text-sm font-medium text-white transition-all duration-300 ease-out hover:bg-[#ff2d20] active:scale-95"
              >
                {t("auth.signOut")}
              </button>
            </form>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
