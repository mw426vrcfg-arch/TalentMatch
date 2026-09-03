// Schneller Selbsttest des Sanitizers:
//   node --experimental-strip-types scripts/check-sanitize.mjs
import {
  sanitizeEmail,
  sanitizeLine,
  sanitizeMultiline,
  sanitizePhone,
  sanitizeUuid,
} from "../lib/security/sanitize.ts";

const cases = [
  ["<script>alert('xss')</script>Hallo", sanitizeMultiline, "alert('xss')Hallo"],
  ["<img src=x onerror=alert(1)>", sanitizeMultiline, ""],
  // Verschachtelt: mehrere Durchläufe, am Ende bleibt kein Tag übrig.
  ["<scr<script>ipt>böse</scr</script>ipt>", sanitizeMultiline, "iptböseipt"],
  ["＜script＞alert(1)＜/script＞", sanitizeMultiline, "alert(1)"],
  ["klick: javascript:alert(1)", sanitizeMultiline, "klick: alert(1)"],
  ["&lt;script&gt;hi&lt;/script&gt;", sanitizeMultiline, "scripthi/script"],
  ["Robert'); DROP TABLE users;--", sanitizeMultiline, "Robert'); DROP TABLE users;--"],
  ["Zeile1\n\n\n\nZeile2", sanitizeMultiline, "Zeile1\n\nZeile2"],
  ["Anna\u200BMüller", sanitizeLine, "AnnaMüller"],
  ["a\u0000b\u0007c", sanitizeLine, "abc"],
  ["  viel    Luft  ", sanitizeLine, "viel Luft"],
];

let failed = 0;
for (const [input, fn, expected] of cases) {
  const actual = fn(input);
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`);
  if (!ok) console.log(`      erwartet: ${JSON.stringify(expected)}`);
}

const idCases = [
  ["8f14e45f-ceea-467a-9c1f-4b2f4f2b9c1d", "8f14e45f-ceea-467a-9c1f-4b2f4f2b9c1d"],
  ["8f14e45f-ceea-467a-9c1f-4b2f4f2b9c1d,role.eq.admin", ""],
  ["*", ""],
];
for (const [input, expected] of idCases) {
  const actual = sanitizeUuid(input);
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  uuid ${JSON.stringify(input)} -> ${JSON.stringify(actual)}`);
}

console.log(`phone: ${JSON.stringify(sanitizePhone("+41 79 <b>123</b> 45 67"))}`);
console.log(`email: ${JSON.stringify(sanitizeEmail("  Anna@Example.COM "))}`);
console.log(`email invalid: ${JSON.stringify(sanitizeEmail("not-an-email"))}`);

console.log(failed === 0 ? "\nAlle Checks bestanden." : `\n${failed} Check(s) fehlgeschlagen.`);
process.exit(failed === 0 ? 0 : 1);
