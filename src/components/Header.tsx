import { useState, useEffect } from "react";
import { Wine, User, Heart, Menu, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userSlug, setUserSlug] = useState<string | null>(null);

  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    const fetchUserSlug = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_profiles_public' as any)
          .select('slug')
          .eq('id', user.id)
          .maybeSingle();
        setUserSlug((data as any)?.slug || null);
      }
    };
    fetchUserSlug();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Wine className="h-8 w-8 text-primary group-hover:text-primary-light transition-colors" />
          <span className="font-serif text-2xl font-bold text-gradient-wine">WineNote</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/events" 
            className={`text-sm font-medium transition-colors ${
              isActive('/events') || isActive('/event')
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            Évènements
          </Link>
          <Link 
            to="/cellars" 
            className={`text-sm font-medium transition-colors ${
              isActive('/cellars') || isActive('/cellar')
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            Cavistes
          </Link>
          <Link 
            to="/learning" 
            className={`text-sm font-medium transition-colors ${
              isActive('/learning') || isActive('/course')
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            Cours
          </Link>
          <Link 
            to="/game" 
            className={`text-sm font-medium transition-colors ${
              isActive('/game')
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            Game
          </Link>
          <Link 
            to="/feed" 
            className={`text-sm font-medium transition-colors ${
              isActive('/feed')
                ? 'text-primary border-b-2 border-primary pb-1' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            Feed
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <GlobalSearchBar />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            aria-label="Ouvrir la recherche"
            onClick={() => {
              setMobileMenuOpen(false);
              // Trouver et cliquer sur le bouton de recherche GlobalSearchBar
              const searchButton = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
              if (searchButton) searchButton.click();
            }}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Button>
          {user && (
            <div className="hidden md:block">
              <NotificationCenter />
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:inline-flex"
            aria-label="Mes favoris"
            onClick={() => user ? navigate('/favorites') : navigate('/auth')}
          >
            <Heart className={`h-5 w-5 ${isActive('/favorites') ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
          </Button>
          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                aria-label="Mon profil"
                onClick={() => {
                  if (userSlug) {
                    navigate(`/user/${userSlug}`);
                  } else {
                    navigate('/complete-profile');
                  }
                }}
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Se déconnecter" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="md:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                <Link 
                  to="/search" 
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Search className="h-5 w-5" />
                  Recherche
                </Link>
                <Link 
                  to="/events" 
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Évènements
                </Link>
                <Link 
                  to="/cellars" 
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cavistes
                </Link>
                <Link 
                  to="/learning" 
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cours
                </Link>
                <Link 
                  to="/game" 
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Game
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
