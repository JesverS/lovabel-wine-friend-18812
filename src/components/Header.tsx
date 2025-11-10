import { useState } from "react";
import { Wine, User, Heart, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <Link to="/events" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Évènements
          </Link>
          <Link to="/cellars" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Cavistes
          </Link>
          <Link to="/learning" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Cours
          </Link>
          <Link to="/game" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Game
          </Link>
        </nav>

        <div className="flex items-center gap-3">
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
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="md:hidden">
                <Menu className="h-5 w-5" />
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
