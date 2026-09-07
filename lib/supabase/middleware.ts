import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { getSupabaseAnonKey, getSupabaseUrl, redirectPathForRole } from "@/lib/supabase/env";
import { getStrikeRestriction } from "@/lib/strikes/restriction";
import { readReturnTo, safeInternalPath } from "@/lib/auth/return-to";

function isOfferApplyPath(path: string) {
  return /\/offers\/[^/]+\/apply(?:\/|$)/.test(path);
}

/** Startseite, Marktplatz und Angebotsdetails — ohne Login erreichbar. */
function isPublicMarketplacePath(path: string) {
  if (path === "/" || path === "/offers") {
    return true;
  }
  return /^\/offers\/[^/]+\/?$/.test(path) && !isOfferApplyPath(path);
}

/** Nur Kunden-/Salon-Bereiche und die Bewerbung selbst verlangen eine Session. */
function isProtectedAppPath(path: string) {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/business") ||
    path.startsWith("/profile") ||
    path.startsWith("/settings") ||
    isOfferApplyPath(path)
  );
}

function redirectLoggedInFromOffers(request: NextRequest, role: string | undefined) {
  const dest = request.nextUrl.clone();
  if (role === "business") {
    dest.pathname = "/business/dashboard";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  dest.pathname = "/dashboard";
  const query = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("stadt");
  dest.search = "";
  if (query) {
    dest.searchParams.set("q", query);
  }
  return NextResponse.redirect(dest);
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/register";
  const isPasswordReset = path === "/reset-password";
  const isProtected = isProtectedAppPath(path);

  // Gäste: kein Supabase-Auth-Roundtrip — öffentliche HTML-Seiten bleiben cachebar.
  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    if (isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("redirectTo", `${path}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role as string | undefined;
  const provider = user?.app_metadata?.provider as string | undefined;

  // Social-Login ohne gewaehlte Rolle: erst die Rollen-Auswahl abschliessen.
  if (
    user &&
    !role &&
    (provider === "google" || provider === "apple") &&
    path !== "/auth/role" &&
    path !== "/reset-password" &&
    !path.startsWith("/auth/callback")
  ) {
    const roleUrl = request.nextUrl.clone();
    roleUrl.pathname = "/auth/role";
    roleUrl.search = "";
    return NextResponse.redirect(roleUrl);
  }

  if (user && role !== "business" && role !== "admin") {
    try {
      const restriction = await getStrikeRestriction(user.id);
      if (restriction.banned) {
        await supabase.auth.signOut();
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = "";
        loginUrl.searchParams.set("error", "strikes");
        const redirectResponse = NextResponse.redirect(loginUrl);
        response.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie);
        });
        return redirectResponse;
      }
    } catch {
      // Strike-Check darf den Request nicht blockieren, wenn die Tabelle fehlt.
    }
  }

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirectTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!user && isPublicMarketplacePath(path)) {
    return response;
  }

  if (isPasswordReset) {
    return response;
  }

  if (user && isAuthPage) {
    const role = (user.user_metadata?.role as string | undefined) ?? "customer";
    const dest = readReturnTo(request.nextUrl.searchParams);
    const redirectUrl = request.nextUrl.clone();
    if (dest && role !== "business" && role !== "admin") {
      const [pathname, search = ""] = dest.split("?");
      redirectUrl.pathname = safeInternalPath(pathname) || redirectPathForRole(role);
      redirectUrl.search = search ? `?${search}` : "";
      return NextResponse.redirect(redirectUrl);
    }
    redirectUrl.pathname = redirectPathForRole(role);
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && path === "/") {
    const home = request.nextUrl.clone();
    home.pathname = redirectPathForRole(role ?? "customer");
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (user && path === "/offers") {
    return redirectLoggedInFromOffers(request, role);
  }

  if (user && (role === "business" || role === "admin")) {
    if (path.startsWith("/business/models")) {
      const inboxUrl = request.nextUrl.clone();
      inboxUrl.pathname = "/business/applications";
      inboxUrl.search = "";
      return NextResponse.redirect(inboxUrl);
    }
    if (path.startsWith("/dashboard") || isOfferApplyPath(path)) {
      const salonUrl = request.nextUrl.clone();
      salonUrl.pathname = "/business/dashboard";
      salonUrl.search = "";
      return NextResponse.redirect(salonUrl);
    }
  }

  if (user && role !== "business" && role !== "admin") {
    if (path.startsWith("/business")) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return response;
}
