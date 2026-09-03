"use client";

import { useActionState, useRef } from "react";
import {
  addHairPortfolioImagesAction,
  removeHairPortfolioImageAction,
  type HairPortfolioFormState,
} from "@/app/dashboard/profile/actions";
import { MAX_PORTFOLIO_IMAGES } from "@/lib/customer/portfolio";

const initialState: HairPortfolioFormState = {};

export function HairPortfolioEditor({ images }: { images: string[] }) {
  const [state, formAction, pending] = useActionState(
    addHairPortfolioImagesAction,
    initialState,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_PORTFOLIO_IMAGES - images.length;

  return (
    <section className="ui-card mt-8 p-5 sm:p-8">
      <p className="ui-kicker">Haar-Portfolio</p>
      <h2 className="mt-3 font-serif text-3xl text-ink">Mein Haar-Portfolio</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Bis zu sechs dauerhafte Bilder. Salons sehen diese Galerie anonymisiert — ohne deinen
        Klarnamen.
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        {images.length} / {MAX_PORTFOLIO_IMAGES} Bilder
      </p>

      {state.error ? <p className="ui-alert-error mt-4">{state.error}</p> : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((url, index) => (
          <figure
            key={url}
            className="ui-glass group relative aspect-[3/4] overflow-hidden rounded-[22px]"
          >
            <img src={url} alt={`Haar ${index + 1}`} className="h-full w-full object-cover" />
            <form action={removeHairPortfolioImageAction} className="absolute right-2 top-2">
              <input type="hidden" name="url" value={url} />
              <button
                type="submit"
                className="ui-btn-secondary px-3 py-1 text-xs"
              >
                Entfernen
              </button>
            </form>
          </figure>
        ))}

        {remaining > 0
          ? Array.from({ length: remaining }).map((_, index) => (
              <button
                key={`empty-${index}`}
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[3/4] cursor-pointer items-center justify-center rounded-[22px] border border-dashed border-neutral-200/80 bg-white/50 text-center text-sm text-neutral-400 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.015] hover:bg-white/90 hover:text-neutral-600 active:scale-95"
              >
                Bild hinzufügen
              </button>
            ))
          : null}
      </div>

      {remaining > 0 ? (
        <form action={formAction} className="mt-6">
          <input
            ref={inputRef}
            type="file"
            name="photos"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="ui-file"
            onChange={(event) => {
              if (event.currentTarget.files?.length) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <p className="mt-2 text-xs text-ink-soft">
            JPG, PNG oder WebP, max. 2 MB je Bild. Du kannst mehrere Dateien auf einmal wählen.
            {pending ? " Wird hochgeladen…" : ""}
          </p>
        </form>
      ) : null}
    </section>
  );
}
