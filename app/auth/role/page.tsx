import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OAuthRoleDialog } from "@/components/auth/oauth-role-dialog";
import { getProfile } from "@/lib/auth/ensure-profile";
import { OAUTH_ROLE_COOKIE, displayNameFromUser, isOAuthRole } from "@/lib/auth/oauth-role";
import { redirectPathForRole } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  apple: "Apple",
};

export default async function OAuthRolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  if (profile) {
    redirect(redirectPathForRole(profile.role));
  }

  const cookieStore = await cookies();
  const pendingRole = cookieStore.get(OAUTH_ROLE_COOKIE)?.value;
  const provider = String(user.app_metadata?.provider ?? "");

  return (
    <main className="relative min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,_rgba(113,113,122,0.35),_transparent_38%),radial-gradient(circle_at_82%_78%,_rgba(63,63,70,0.4),_transparent_42%)]" />
      <OAuthRoleDialog
        initialRole={isOAuthRole(pendingRole) ? pendingRole : "customer"}
        suggestedName={displayNameFromUser(user)}
        provider={PROVIDER_LABEL[provider] ?? (provider || "OAuth")}
      />
    </main>
  );
}
