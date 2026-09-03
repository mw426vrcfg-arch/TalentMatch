"use client";

import { useState } from "react";
import { CreateOfferForm } from "@/components/business/create-offer-form";

export function CreateOfferWorkspace({
  location,
  urgentLimitReached = false,
  urgentLimit = 3,
  urgentUsed = 0,
}: {
  location?: string | null;
  urgentLimitReached?: boolean;
  urgentLimit?: number;
  urgentUsed?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-primary min-h-14 w-full px-8 text-base sm:w-auto"
      >
        + Neues Angebot erstellen
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="app-screen flex max-h-[96vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] border border-white/20 bg-white/90 shadow-[0_30px_80px_rgba(15,15,20,0.24)] backdrop-blur-xl sm:rounded-[32px]">
            <div className="flex items-start justify-between gap-3 border-b border-white/30 px-5 py-4 sm:px-8">
              <div>
                <p className="ui-kicker">Neues Angebot</p>
                <h2 className="mt-1 font-serif text-3xl text-ink">Deal veröffentlichen</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Location kommt von deinem Salonprofil
                  {location ? ` (${location})` : ""}.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="ui-btn-secondary px-3 text-xs">
                Schliessen
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-6 sm:px-8">
              <CreateOfferForm
                onCancel={() => setOpen(false)}
                urgentLimitReached={urgentLimitReached}
                urgentLimit={urgentLimit}
                urgentUsed={urgentUsed}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
