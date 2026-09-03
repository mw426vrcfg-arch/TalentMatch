import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = {
  title: "Impressum · TalentMatch",
};

export default function ImpressumPage() {
  return (
    <LegalPage kicker="Rechtliches" title="Impressum" updated="Vorlage — Angaben bitte ergänzen">
      <LegalSection title="Anbieter">
        <p>[Firmenname / Betreiber]</p>
        <p>[Rechtsform, z. B. GmbH]</p>
        <p>[Strasse und Hausnummer]</p>
        <p>[PLZ Ort], Schweiz</p>
      </LegalSection>
      <LegalSection title="Kontakt">
        <p>E-Mail: [kontakt@example.com]</p>
        <p>Telefon: [+41 …]</p>
      </LegalSection>
      <LegalSection title="Vertretungsberechtigte Person">
        <p>[Vorname Nachname], [Funktion]</p>
      </LegalSection>
      <LegalSection title="Handelsregister / UID">
        <p>Handelsregisteramt: [Kanton]</p>
        <p>UID / CHE-Nummer: [CHE-XXX.XXX.XXX]</p>
      </LegalSection>
      <LegalSection title="Haftungshinweis">
        <p>
          TalentMatch ist ein Marktplatz. Inhalte von Salons und Kunden sowie die Durchführung von
          Beauty-Dienstleistungen liegen in der Verantwortung der jeweiligen Nutzer. Weitere
          Hinweise finden sich in den AGB.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
