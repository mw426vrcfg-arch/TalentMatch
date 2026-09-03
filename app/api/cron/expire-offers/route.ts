import { runOfferExpiryJob } from "@/lib/offers/expire";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dry=1 zeigt nur an, was der Lauf treffen würde. Die Zeitbasis lässt sich
  // dabei verschieben (?now=<ISO oder ms>), um die Erkennung zu prüfen.
  const params = new URL(request.url).searchParams;
  const dryRun = params.get("dry") === "1";
  const nowParam = params.get("now");
  const parsedNow = nowParam ? Number(nowParam) || Date.parse(nowParam) : NaN;

  const result = await runOfferExpiryJob({
    dryRun,
    now: dryRun && !Number.isNaN(parsedNow) ? parsedNow : undefined,
  });

  return Response.json({
    ok: true,
    dry_run: dryRun,
    checked: result.checked,
    expired: result.expired_offer_ids.length,
    expired_offer_ids: dryRun ? result.expired_offer_ids : undefined,
    status_used: result.status_used,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
