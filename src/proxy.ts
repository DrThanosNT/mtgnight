import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "mtg_session";
const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

function isMobile(userAgent: string) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/icons") || pathname === "/manifest.json") {
    return NextResponse.next();
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  if (!isMobile(userAgent)) {
    return new NextResponse("This app is mobile-only. Open it on your phone.", { status: 403 });
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(COOKIE_NAME);
  if (!hasSession && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasSession && !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};