# TalentMatch – Anforderungen (nächste Programmierschritte)

Schritt-für-Schritt-Liste nach `master_design.txt` (Kapitel 8–13).  
Aktueller Stand: Datenbankschema liegt in `schema.sql`. Als Nächstes kommt das Next.js-Projekt mit Supabase.

Arbeite die Punkte in dieser Reihenfolge ab. Ein Schritt gilt erst als erledigt, wenn du ihn manuell im Browser oder per API geprüft hast.

---

## 0. Fundament (jetzt)

- [x] Datenmodell aus Kapitel 7 in `schema.sql` abbilden
- [ ] Supabase-Projekt anlegen (EU-Region, z. B. `eu-central-1`)
- [ ] `schema.sql` im Supabase SQL Editor ausführen
- [ ] Storage-Bucket `application-images` anlegen (privat)
- [ ] `business_profile_setup.sql` ausführen (Adresse, Telefon, Logo + Bucket `business-images`)
- [x] Next.js-App im Repo initialisieren (App Router, TypeScript)
- [x] Umgebungsvariablen setzen: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, später `SUPABASE_SERVICE_ROLE_KEY` und Stripe-Keys
- [x] Supabase-Client (Browser + Server) einrichten

---

## 1. Auth-System

Rollen: `customer`, `business`, `admin`. Registrierung schreibt automatisch eine Zeile in `public.users` (Trigger in `schema.sql`).

- [x] Login / Logout / Session (Supabase Auth, E-Mail + Passwort)
- [x] Registrierung mit Rollenwahl (Kunde oder Salon)
- [x] Nach Business-Registrierung: `business_profiles` anlegen (Name, Ort, Beschreibung)
- [x] Salon-Profil bearbeiten (`/business/profile`): Name, Adresse, Ort, Telefon, Logo (`business-images`)
- [x] Geschützte Routen: `/dashboard` nur Kunden, `/business/*` nur Salons
- [x] RLS-Policies: `rls_policies.sql` im Supabase SQL Editor ausführen

---

## 2. Angebote erstellen (Business)

Flow aus Kapitel 4.2: ohne Angebot kein Marktplatz.

- [x] Salon-Dashboard `/business/dashboard` mit Formular «Neues Angebot erstellen»
- [x] Pflichtfelder: Service Title, Description, Normal Price, Discount Price, Duration, Available Slots
- [x] Slots anlegen: `start_time` / `end_time` zu einem Offer (Endzeit = Start + Duration)
- [ ] Angebot aktivieren / deaktivieren
- [x] RLS: `rls_policies.sql` (Offers + Slots bleiben in auth_policies / schema)

---

## 3. Angebote entdecken (Kunde)

Routen aus Kapitel 11: `/offers`, `/offers/[id]`.

- [x] Landing `/` mit kurzer Erklärung und CTA zu Angeboten
- [x] Browse-Screen für Kunden (`/dashboard`): aktive Angebote als Cards
- [x] Card-Inhalt: Service Title, Discount Price, Original Price, Location, Salon-Name, verfügbare Slots
- [x] Filter: Stadt (`location`)
- [x] Detailseite: Beschreibung, Bedingungen, Slots, Salon-Infos
- [ ] RLS: aktive Angebote und zugehörige Profile/Slots öffentlich lesbar

---

## 4. Bewerben + Bilder

Kernmechanismus: nicht direkt buchen, sondern bewerben (`applications`).

- [x] Seite `/offers/[id]/apply` nur für eingeloggte Kunden
- [x] Bild-Upload (Front / Back / Side) nach Storage, URLs in `uploaded_images`
- [x] Notizen-Feld, Absenden mit Status `pending`
- [x] Kunden-Dashboard `/dashboard`: eigene Bewerbungen und Status
- [x] RLS: `rls_policies.sql` für Applications + Storage

---

## 5. Annehmen / Ablehnen (Salon)

Kapitel 4.5 und Endpoints `POST /applications/accept`.

- [x] Salon-Dashboard: Sektion «Eingegangene Bewerbungen» (pending, Bilder, Notizen, Profil)
- [x] Accept: Application → `accepted`, Slot `is_booked = true`
- [x] Reject: Application → `rejected`, Slot bleibt frei
- [x] Kunde sieht Statusänderung auf dem Dashboard
- [x] Offer-Status `full`, wenn keine freien Slots mehr

---

## 6. Stripe Connect (Zahlung)

Kapitel 6, 9 und 10. Währung: CHF. Full Prepayment.

- [ ] Salon verbindet Stripe Connect (`stripe_account_id` am Business-Profil)
- [ ] Nach Accept: Checkout-Session (`POST /payments/create-checkout`)
- [ ] Webhook `checkout.session.completed`: Booking anlegen, `payment_status = paid`, Slot `is_booked = true`
- [ ] Plattformgebühr abziehen, `platform_fee` / `salon_payout` speichern
- [ ] Auszahlung verzögert (nach Durchführung / `completed`)
- [ ] Storno-Regeln vorbereiten (>48h voll, 24–48h 50 %, <24h / No-Show 0 %)

---

## 7. Booking-System (Termin)

Kapitel 4.6–4.7 und Endpoints `POST /bookings/complete`, `POST /bookings/no-show`.

- [ ] Booking in beiden Dashboards anzeigen (Termin, Status, Betrag)
- [x] Salon markiert Termin als `completed` → Payout freigeben
- [x] Salon markiert `no_show` → kein Refund, Strike für den Kunden
- [ ] Salon-Cancel: Slot wieder öffnen, Kunde refunden
- [ ] Kunde zahlt nicht rechtzeitig: Application verfällt, Slot frei

---

## 8. Reviews, Strikes, Trust

Kapitel 3.8, 3.9, 4.8 und Tabellen `reviews` / `strikes`.

- [x] Nach `completed`: Review-Aufforderung an Kunde und Salon
- [x] Bewertung 1–5 + Kommentar, je Booking und Reviewer einmal (`ratings`)
- [x] Strike bei No-Show, kurzfristiger Absage, falschen Bildern
- [x] 1 Strike = Warnung, 2 = 14 Tage Sperre, 3 = permanenter Ban (Login gesperrt)
- [x] Reliability-Hinweis für den Salon in der Bewerbungsliste (Anzahl aktiver Strikes)

---

## 9. Benachrichtigungen

Letzter MVP-Schritt aus Kapitel 12.

- [x] Kunde: Bewerbung angenommen → In-App «Termin bestätigt»; Salon: neue Bewerbung
- [x] Glocke in der Navigation, Tabelle `notifications` (`notifications.sql`)
- [ ] E-Mail (Supabase Auth / Resend o. Ä.) später optional

---

## 10. Qualität und Launch-Vorbereitung

- [ ] Admin-Rolle: Streitfälle, Verifizierung (`verified`), manuelle Refunds
- [ ] Grundlegende Tests für Auth, Apply, Accept, Webhook, No-Show
- [ ] Deployment: Vercel + produktives Supabase + Stripe Live (erst nach Tests)

---

## Hinweis zur Reihenfolge

Nicht parallel Stripe und Reviews bauen. Der produktive Pfad ist:

**Schema → Auth → Offer → Browse → Apply → Accept → Pay → Attend → Review**

Das entspricht dem Plattform-Flow in Kapitel 4. Jeder fehlende Schritt bricht die Conversion.
