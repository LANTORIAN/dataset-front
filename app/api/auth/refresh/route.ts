import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087/api/v1";
const COOKIE_NAME = "refresh_token";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(COOKIE_NAME)?.value;
  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  let res: Response;
  try {
    const url = new URL(`${BACKEND}/auth/refresh`);
    url.searchParams.set("refresh_token", refreshToken);
    res = await fetch(url.toString(), { method: "POST" });
  } catch {
    // Backend injoignable — on efface le cookie corrompu
    const response = NextResponse.json({ detail: "Backend injoignable" }, { status: 503 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (!res.ok) {
    // Token invalide ou expiré — on efface le cookie
    const response = NextResponse.json({ detail: "Session expirée" }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const data: { access_token: string; refresh_token: string } = await res.json();

  const response = NextResponse.json({ access_token: data.access_token });
  // Rotation du refresh token
  response.cookies.set(COOKIE_NAME, data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
