import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./utils/supabase/config";
import {
  getMembershipClaimsFromAccessToken,
  hasMembershipClaims,
} from "./utils/supabase/session";

function redirectWithAuthState(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  const redirectResponse = NextResponse.redirect(redirectUrl);

  response.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;
    redirectResponse.cookies.set(name, value, options);
  });

  ["cache-control", "expires", "pragma"].forEach((headerName) => {
    const value = response.headers.get(headerName);

    if (value) {
      redirectResponse.headers.set(headerName, value);
    }
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  const session =
    existingSession ??
    (await supabase.auth.signInAnonymously()).data.session ??
    null;

  const claims = getMembershipClaimsFromAccessToken(session?.access_token);
  const pathname = request.nextUrl.pathname;
  const isInviteRoute = pathname.startsWith("/group/invite/");
  const isProtectedGroupRoute =
    pathname === "/group" || pathname.startsWith("/group/");

  if (
    isProtectedGroupRoute &&
    !isInviteRoute &&
    !hasMembershipClaims(claims) &&
    !session
  ) {
    // 未認証 → / でグループ作成/参加
    return redirectWithAuthState(request, response, "/");
  }

  if (pathname === "/" && hasMembershipClaims(claims)) {
    return redirectWithAuthState(request, response, "/group");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
