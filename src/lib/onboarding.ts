import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRAND_NAME } from "@/lib/brand";

export const ONBOARDING_STEPS = 5;

export interface OnboardingProfile {
  id: string;
  full_name: string | null;
  shop_name: string | null;
  onboarding_step: number;
  onboarding_done: boolean;
}

/** Reads (and lazily creates) the signed-in user's profile row. */
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OnboardingProfile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, shop_name, onboarding_step, onboarding_done")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        if (data.shop_name !== BRAND_NAME) {
          const { error: brandError } = await supabase
            .from("profiles")
            .update({ shop_name: BRAND_NAME })
            .eq("id", user.id);
          if (brandError) throw brandError;
        }
        return { ...data, shop_name: BRAND_NAME } as OnboardingProfile;
      }

      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, shop_name: BRAND_NAME })
        .select("id, full_name, shop_name, onboarding_step, onboarding_done")
        .single();
      if (insertError) throw insertError;
      return created as OnboardingProfile;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      patch: Partial<OnboardingProfile> & { onboarding_completed_at?: string },
    ) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...patch, shop_name: BRAND_NAME })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
