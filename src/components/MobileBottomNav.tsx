import { Home, MessageSquare, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSlug } from "@/hooks/useUserSlug";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Accueil", path: "/" },
  { icon: MessageSquare, label: "Feed", path: "/feed" },
  { icon: Heart, label: "Favoris", path: "/favorites" },
];

export const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const slug = useUserSlug();

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
            aria-label={label}
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
          aria-label="Profil"
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
