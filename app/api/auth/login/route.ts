import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/backend-url";

const BACKEND = getBackendApiUrl();
const COOKIE_NAME = "refresh_token";

export async function POST(req: NextRequest) {
  const body = await req.text(); // x-www-form-urlencoded from client

  let res: Response;
  try {
    res = await fetch(`${BACKEND}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return NextResponse.json(
      { detail: "Impossible de joindre le serveur. Vérifiez que le backend est démarré." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    return NextResponse.json(err, { status: res.status });
  }

  const data: { access_token: string; refresh_token: string } = await res.json();

  const response = NextResponse.json({ access_token: data.access_token });
  response.cookies.set(COOKIE_NAME, data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });

  return response;
}
