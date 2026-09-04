import type { BrowseOffer } from "@/lib/offers/load-active-offers";

export type InspirationTile = {
  id: string;
  before_url: string | null;
  after_url: string | null;
  region: string;
  partner_name: string;
  offer: BrowseOffer | null;
};
