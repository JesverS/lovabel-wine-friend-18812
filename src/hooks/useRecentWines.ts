import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentWine {
  id: string;
  name: string;
  year: number | null;
  label_url: string | null;
  domain_name: string | null;
  domain_region: string | null;
}

export const useRecentWines = (limit = 12) => {
  return useQuery({
    queryKey: ["recent-wines", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wine")
        .select("id, name, year, label_url, domain:domain_id(name)")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        year: w.year,
        label_url: w.label_url,
        domain_name: w.domain?.name || null,
      })) as RecentWine[];
    },
    staleTime: 5 * 60 * 1000,
  });
};
