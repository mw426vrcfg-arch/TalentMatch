import { partnerSalonCode } from "@/lib/offers/anonymize";

export function partnerModelLabel(stableId: string) {
  return `Modell #${partnerSalonCode(stableId)}`;
}
