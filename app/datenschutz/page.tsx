import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = {
  title: "Datenschutz · TalentMatch",
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      kicker="Rechtliches"
      title="Datenschutzerklärung"
      updated="Vorlage — vor Go-Live rechtlich prüfen"
    >
      <LegalSection title="1. Verantwortliche Stelle">
        <p>[Firmenname]</p>
        <p>[Adresse]</p>
        <p>E-Mail: [datenschutz@example.com]</p>
      </LegalSection>
      <LegalSection title="2. Welche Daten wir verarbeiten">
        <p>
          Kontodaten (Name, E-Mail, Rolle), Profildaten, Buchungs- und Bewerbungsdaten sowie
          technische Nutzungsdaten. Platzhalter: genaue Kategorien und Speicherdauer ergänzen.
        </p>
      </LegalSection>
      <LegalSection title="3. Haar- und Bewerbungsfotos">
        <p>
          Für Bewerbungen auf Angebote laden Kunden Haarfotos (Front, Seite, Hinterkopf) hoch. Diese
          Bilder dienen ausschliesslich dem Matching und der Prüfung durch den Salon. Details zur
          Einwilligung stehen in den AGB.
        </p>
      </LegalSection>
      <LegalSection title="4. Zweck und Rechtsgrundlage">
        <p>
          [Platzhalter: Vertragserfüllung, berechtigte Interessen, Einwilligung — DSG / nDSG bzw.
          DSGVO, falls anwendbar.]
        </p>
      </LegalSection>
      <LegalSection title="5. Empfänger">
        <p>
          Salons sehen Bewerbungsfotos und Profildaten nach einer Bewerbung. Nach Annahme eines
          Termins können Kontaktdaten ausgetauscht werden. Hosting: [Anbieter, z. B. Supabase /
          Region].
        </p>
      </LegalSection>
      <LegalSection title="6. Speicherdauer">
        <p>[Platzhalter: Dauer für Konten, Fotos, Buchungen und Strike-Protokolle.]</p>
      </LegalSection>
      <LegalSection title="7. Ihre Rechte">
        <p>
          Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch nach geltendem
          Datenschutzrecht. Anfragen an [datenschutz@example.com].
        </p>
      </LegalSection>
      <LegalSection title="8. Cookies und Analyse">
        <p>[Platzhalter: Session-Cookies für Login. Keine/weitere Tracker ergänzen.]</p>
      </LegalSection>
    </LegalPage>
  );
}
