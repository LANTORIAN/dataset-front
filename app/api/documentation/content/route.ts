import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/backend-url";

const BACKEND = getBackendApiUrl();
const SECTION = "documentation";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/support/content/${SECTION}`, {
      next: { revalidate: 180 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json({ detail: "Documentation indisponible" }, { status: res.status });
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    response.headers.set("Cache-Control", "public, s-maxage=180, stale-while-revalidate=600");
    return response;
  } catch {
    return NextResponse.json({ detail: "Backend indisponible" }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ detail: "Authentification requise" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ detail: "Payload JSON invalide" }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND}/admin/support/content/${SECTION}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({ content: payload }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({ detail: "Reponse backend invalide" }));
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend indisponible" }, { status: 503 });
  }
}
