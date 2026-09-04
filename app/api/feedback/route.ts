import { NextResponse } from "next/server";
import { sendFeedbackAction } from "@/app/actions/send-feedback";

export async function POST(request: Request) {
  let message = "";
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { message?: string };
      message = String(body.message ?? "");
    } else {
      const form = await request.formData();
      message = String(form.get("message") ?? "");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const formData = new FormData();
  formData.set("message", message);
  const result = await sendFeedbackAction(formData);
  return NextResponse.json(result, {
    status: result.success ? 200 : result.error?.includes("Anmeldung") ? 401 : 400,
  });
}
