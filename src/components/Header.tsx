import { Wine, Search, User, Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Wine className="h-8 w-8 text-primary group-hover:text-primary-light transition-colors" />
          <span className="font-serif text-2xl font-bold text-gradient-wine">Lovabel</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/discover" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Découvrir
          </Link>
          <Link to="/events" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Évènements
          </Link>
          <Link to="/cavistes" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Cavistes
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
