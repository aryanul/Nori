import { auth } from "@/auth";

export default auth((req) => {
  const isAuthed = !!req.auth;
  const { pathname } = req.nextUrl;

  // Allow these even when unauthenticated.
  // /api/* routes do their own auth check (so XHR clients get clean JSON
  // 401/403 responses instead of HTML redirects).
  const isPublic =
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!isAuthed && !isPublic) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    // Preserve the full path INCLUDING search params so things like
    // /w/<id>?invite=<token> survive the sign-in detour. Without the search
    // string, share-link visitors lose their invite and get 404'd after auth.
    signInUrl.searchParams.set("from", `${pathname}${req.nextUrl.search}`);
    return Response.redirect(signInUrl);
  }

  if (isAuthed && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Skip the proxy for:
  //   - Next.js internals (/_next/*)
  //   - Any request whose path contains a "." — i.e. files with extensions:
  //     /icon.png, /nori-logo.png, /favicon.ico, /sitemap.xml, fonts, etc.
  //   - The icon-image route generated from src/app/icon.png
  // Without this, unauthenticated requests for the logo redirect to /sign-in
  // and next/image's optimizer fails to fetch the source PNG.
  matcher: ["/((?!_next|.*\\..*).*)"],
};
