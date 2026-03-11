import { useState } from "react";
import { Wine, User, Heart, Menu, LogOut, Search, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useUserSlug } from "@/hooks/useUserSlug";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const userSlug = useUserSlug();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => 
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSignOutDialogOpen(false);
    navigate('/');
  };

  return (
    <>
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
                const searchButton = document.querySelector('[data-search-trigger]') as HTMLButtonElement;
                if (searchButton) searchButton.click();
              }}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </Button>
            {user && (
              <NotificationCenter />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="hidden md:inline-flex"
              aria-label="Changer de thème"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
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
                  className="hidden md:inline-flex"
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hidden md:inline-flex"
                  aria-label="Se déconnecter" 
                  onClick={() => setSignOutDialogOpen(true)}
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button asChild className="hidden md:inline-flex">
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

                  <Separator />

                  <Link 
                    to="/feed" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Feed
                  </Link>
                  <Link 
                    to="/favorites" 
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="h-5 w-5" />
                    Favoris
                  </Link>
                  {user && (
                    <Link 
                      to="/notifications" 
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bell className="h-5 w-5" />
                      Notifications
                    </Link>
                  )}

                  <Separator />

                  <button
                    className="flex items-center gap-2 text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                  </button>

                  {user && (
                    <button
                      className="flex items-center gap-2 text-lg font-medium text-destructive hover:text-destructive/80 transition-colors text-left"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setSignOutDialogOpen(true);
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      Se déconnecter
                    </button>
                  )}

                  {!user && (
                    <Link 
                      to="/auth" 
                      className="text-lg font-medium text-primary hover:text-primary/80 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Connexion
                    </Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment vous déconnecter de votre compte ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Se déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
