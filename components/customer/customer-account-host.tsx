import { CustomerAccountMenu } from "@/components/customer/customer-account-menu";
import { getProfile } from "@/lib/auth/ensure-profile";
import { loadCustomerProfile } from "@/lib/customer/profile-store";
import { resolveAvatarUrl } from "@/lib/customer/images";
import { loadCustomerLoyalty } from "@/lib/loyalty/store";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function CustomerAccountHost({
  fallbackName,
}: {
  fallbackName?: string | null;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    let name = fallbackName?.trim() ?? "";
    try {
      const profile = await getProfile(user.id);
      if (profile?.full_name?.trim()) {
        name = profile.full_name.trim();
      }
    } catch {
      // Fallback name stays.
    }

    const admin = tryCreateAdminClient();
    let points = 0;
    let avatarUrl: string | null = null;

    if (admin) {
      const [loyalty, loaded] = await Promise.all([
        loadCustomerLoyalty(admin, user.id).catch(() => ({ points: 0, level: "Bronze" as const })),
        loadCustomerProfile(admin, user.id).catch(() => ({ profile: null })),
      ]);
      points = loyalty.points;
      if (loaded.profile?.full_name?.trim()) {
        name = loaded.profile.full_name.trim();
      }
      avatarUrl = resolveAvatarUrl(loaded.profile?.avatar_url);
    }

    return <CustomerAccountMenu name={name} points={points} avatarUrl={avatarUrl} />;
  } catch (error) {
    console.error(
      "Customer account menu failed:",
      error instanceof Error ? error.message : error,
    );
    if (!fallbackName?.trim()) {
      return null;
    }
    return <CustomerAccountMenu name={fallbackName.trim()} points={0} avatarUrl={null} />;
  }
}
