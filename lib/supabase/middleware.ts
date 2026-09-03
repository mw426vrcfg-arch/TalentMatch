import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, redirectPathForRole } from "@/lib/supabase/env";
import { getStrikeRestriction } from "@/lib/strikes/restriction";

export async function updateSession(request: NextRequest) {
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

  const path = request.nextUrl.pathname;
  const isAuthPage = path === "/login" || path === "/register";
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/business") ||
    path.includes("/apply");

  const role = user?.user_metadata?.role as string | undefined;
  const provider = user?.app_metadata?.provider as string | undefined;

  // Social-Login ohne gewaehlte Rolle: erst die Rollen-Auswahl abschliessen.
  if (
    user &&
    !role &&
    (provider === "google" || provider === "apple") &&
    path !== "/auth/role" &&
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
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPage) {
    const role = (user.user_metadata?.role as string | undefined) ?? "customer";
    const redirectUrl = request.nextUrl.clone();
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

  if (user && (role === "business" || role === "admin")) {
    if (path.startsWith("/business/models")) {
      const inboxUrl = request.nextUrl.clone();
      inboxUrl.pathname = "/business/applications";
      inboxUrl.search = "";
      return NextResponse.redirect(inboxUrl);
    }
    if (path.startsWith("/dashboard") || path.startsWith("/offers")) {
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
