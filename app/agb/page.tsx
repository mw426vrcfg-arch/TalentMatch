import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = {
  title: "AGB · TalentMatch",
};

export default function AgbPage() {
  return (
    <LegalPage
      kicker="Rechtliches"
      title="Allgemeine Geschäftsbedingungen"
      updated="Vorlage — vor Go-Live rechtlich prüfen"
    >
      <LegalSection title="1. Geltungsbereich">
        <p>
          Diese AGB gelten für die Nutzung der Plattform TalentMatch durch Salons (Anbieter) und
          Kunden bzw. Modelle (Nachfrager). Mit der Registrierung oder Nutzung akzeptierst du diese
          Bedingungen.
        </p>
        <p>Betreiber: [Firmenname, Adresse — siehe Impressum].</p>
      </LegalSection>

      <LegalSection title="2. Leistungsbeschreibung">
        <p>
          TalentMatch vermittelt Termine für vergünstigte Beauty-Dienstleistungen. Die Plattform
          stellt Tools für Angebote, Bewerbungen, Buchungen, Bewertungen und das Strike-System
          bereit. Vertragspartner der eigentlichen Dienstleistung ist der Salon, nicht TalentMatch.
        </p>
      </LegalSection>

      <LegalSection title="3. Haftungsausschluss für Beauty-Dienstleistungen">
        <p>
          TalentMatch erbringt selbst keine Friseur-, Kosmetik- oder sonstigen
          Beauty-Behandlungen. Qualität, Durchführung, Hygiene, Beratung, Produkte und das Ergebnis
          der Behandlung liegen ausschliesslich beim Salon bzw. bei den ausführenden Personen.
        </p>
        <p>
          Soweit gesetzlich zulässig, haftet TalentMatch nicht für Schäden, Verletzungen,
          allergische Reaktionen, unzufriedenstellende Ergebnisse, verspätete oder ausgefallene
          Termine oder sonstige Folgen, die aus der Dienstleistung eines Salons oder aus dem
          Verhalten eines Kunden entstehen. Ansprüche aus der Behandlung sind direkt gegenüber dem
          Salon geltend zu machen.
        </p>
        <p>
          Die Plattform übernimmt keine Gewähr für die Richtigkeit von Angebotsbeschreibungen,
          Preisen, Qualifikationen oder Nutzerangaben.
        </p>
      </LegalSection>

      <LegalSection title="4. Haarfotos und Bildverarbeitung">
        <p>
          Wer sich auf ein Angebot bewirbt, lädt Haarfotos hoch (typischerweise Front, Seite und
          Hinterkopf). Mit dem Upload erteilst du TalentMatch und dem jeweils ausgewählten Salon die
          Erlaubnis, diese Bilder zum Zweck der Bewerbung, des Matchings, der Terminprüfung und der
          internen Qualitätssicherung zu speichern und zu verarbeiten.
        </p>
        <p>
          Die Fotos dürfen nicht für Werbung Dritter verwendet werden, ausser du stimmst dem
          gesondert zu. Du versicherst, dass die Bilder dich zeigen, aktuell sind und keine Rechte
          Dritter verletzen. Falsche oder fremde Bilder können zu Ablehnung der Bewerbung und zu
          einem Strike führen.
        </p>
      </LegalSection>

      <LegalSection title="5. Strike-System und Sperrung">
        <p>
          Um No-Shows und Missbrauch zu begrenzen, führt TalentMatch ein Strike-System. Ein Strike
          kann insbesondere vergeben werden bei unentschuldigtem Fernbleiben (No-Show), kurzfristiger
          Absage entgegen den Plattformregeln oder offensichtlich falschen Bewerbungsbildern.
        </p>
        <p>
          Mit der Nutzung der Plattform akzeptierst du dieses System rechtlich verbindlich: Nach drei
          (3) Strikes — insbesondere nach drei No-Shows — kann dein Kundenkonto dauerhaft gesperrt
          werden. Eine Sperrung schliesst den Login und die weitere Nutzung von TalentMatch aus.
          Vorstufen (Warnung, zeitweise Einschränkung) können nach Ermessen der Plattform greifen.
        </p>
        <p>
          Die Sperrung nach dem dritten Strike ist eine vertraglich vereinbarte Massnahme zum Schutz
          der Salons und der übrigen Nutzer. Ein Anspruch auf Reaktivierung besteht nicht, soweit
          nicht zwingendes Recht entgegensteht.
        </p>
      </LegalSection>

      <LegalSection title="6. Buchungen, Zahlung, Stornierung">
        <p>
          [Platzhalter: Zahlungsabwicklung, No-Show ohne Rückerstattung, Salon-Storno, Slot-Freigabe.]
        </p>
      </LegalSection>

      <LegalSection title="7. Bewertungen">
        <p>
          [Platzhalter: gegenseitige Reviews nach Abschluss, keine rechtswidrigen Inhalte.]
        </p>
      </LegalSection>

      <LegalSection title="8. Pflichten der Nutzer">
        <p>
          [Platzhalter: wahrheitsgemässe Angaben, respektvoller Umgang, keine Umgehung der Plattform
          vor bestätigtem Termin.]
        </p>
      </LegalSection>

      <LegalSection title="9. Änderungen und anwendbares Recht">
        <p>
          [Platzhalter: Schweizer Recht, Gerichtsstand [Ort], Salvatorische Klausel.]
        </p>
      </LegalSection>
    </LegalPage>
  );
}
