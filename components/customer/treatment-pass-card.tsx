import { hasTreatmentPassData, thicknessLabel, type TreatmentPass } from "@/lib/customer/treatment-pass";
import { hairLabel, type HairProfile } from "@/lib/hair/criteria";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="ui-kicker">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{value || "–"}</dd>
    </div>
  );
}

export function TreatmentPassCard({
  pass,
  hair,
}: {
  pass: TreatmentPass;
  hair?: HairProfile | null;
}) {
  const filled = hasTreatmentPassData(pass);

  return (
    <aside className="rounded-[22px] border border-white/30 bg-gradient-to-br from-white/80 via-white/60 to-zinc-100/70 p-4 shadow-[0_12px_32px_rgba(15,15,20,0.05)] backdrop-blur-md sm:p-5">
      <p className="ui-kicker">Digitaler Behandlungs-Pass</p>
      <p className="mt-1.5 font-serif text-xl text-ink">Chemische Historie</p>

      {filled ? (
        <dl className="mt-4 space-y-3">
          <Row label="Letzte Blondierung" value={pass.last_bleaching} />
          <Row label="Chemische Behandlungen" value={pass.chemical_treatments} />
          <Row label="Haardicke" value={thicknessLabel(pass.hair_thickness)} />
        </dl>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Das Modell hat noch keine Haargeschichte hinterlegt. Frag im Chat nach, bevor du chemisch arbeitest.
        </p>
      )}

      {hair ? (
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-white/40 pt-3">
          <Row label="Struktur" value={hairLabel("structure", hair.structure)} />
          <Row label="Länge" value={hairLabel("length", hair.length)} />
          <Row label="Vorbehandlung" value={hairLabel("chemical", hair.chemical)} />
        </dl>
      ) : null}
    </aside>
  );
}
