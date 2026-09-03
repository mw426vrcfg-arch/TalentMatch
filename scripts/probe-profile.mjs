// Diagnose: welche Spalten hat customer_profiles wirklich und was steht drin?
//   node --env-file=.env.local scripts/probe-profile.mjs
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data, error } = await admin.from("customer_profiles").select("*").limit(5);
if (error) {
  console.log("FEHLER beim Lesen:", error.message);
  process.exit(1);
}

console.log("Zeilen:", data.length);
console.log("Spalten:", data[0] ? Object.keys(data[0]).join(", ") : "(keine Zeile vorhanden)");

const interesting = [
  "hair_structure",
  "hair_length",
  "hair_chemical",
  "last_bleaching",
  "chemical_treatments",
  "hair_thickness",
  "hair_portfolio",
  "gallery_urls",
];

for (const column of interesting) {
  const { error: columnError } = await admin.from("customer_profiles").select(column).limit(1);
  console.log(`${columnError ? "FEHLT " : "da    "} ${column}${columnError ? "  -> " + columnError.message : ""}`);
}

console.log("\nInhalte:");
for (const row of data) {
  const view = {};
  for (const column of interesting) {
    if (column in row) view[column] = row[column];
  }
  console.log(" ", row.user_id ?? row.id, JSON.stringify(view));
}

const { data: buckets } = await admin.storage.listBuckets();
console.log("\nBuckets:", (buckets ?? []).map((b) => `${b.name}(public=${b.public})`).join(", "));

for (const row of data) {
  const uid = row.user_id ?? row.id;
  const { data: files, error: listError } = await admin.storage
    .from("customer-images")
    .list(`${uid}/portfolio`);
  console.log(
    `Storage ${uid}/portfolio:`,
    listError ? "FEHLER " + listError.message : `${files?.length ?? 0} Datei(en)`,
    (files ?? []).map((f) => f.name).join(", "),
  );
}
