import { Home, Search, MessageSquare, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: Search, label: "Recherche", path: "/search" },
  { icon: MessageSquare, label: "Feed", path: "/feed" },
  { icon: Heart, label: "Favoris", path: "/favorites" },
];

export const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setSlug(null); return; }
    supabase
      .from("user_profiles_public" as any)
      .select("slug")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => { if ((data as any)?.slug) setSlug((data as any).slug); });
  }, [user]);

  const profilePath = user && slug ? `/user/${slug}` : "/auth";

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
              isActive(path) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
        <Link
          to={profilePath}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors",
            pathname.startsWith("/user/") || pathname === "/auth" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </div>
    </nav>
  );
};
