import { Wine, Search, User, Heart, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          <Link to="/search" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Découvrir
          </Link>
          <Link to="/events" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Évènements
          </Link>
          <Link to="/cellars" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Cavistes
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" asChild>
            <Link to="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Heart className="h-5 w-5" />
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/user/${user.id}`}>
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
          <Button size="icon" variant="ghost" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
