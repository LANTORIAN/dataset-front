import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/lib/server/backend-url";

const BACKEND = getBackendApiUrl();
const COOKIE_NAME = "refresh_token";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(COOKIE_NAME)?.value;
  const authHeader = req.headers.get("Authorization");

  // Invalider côté backend en best-effort
  if (authHeader) {
    fetch(`${BACKEND}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ refresh_token: refreshToken ?? null }),
    }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
