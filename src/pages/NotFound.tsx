import { Wine, Home, Search, BookOpen, Calendar, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-grow flex items-center justify-center pt-20 pb-12">
        <div className="container mx-auto px-4 text-center">
          {/* Wine Icon */}
          <div className="relative mb-8">
            <Wine className="h-24 w-24 text-primary mx-auto opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl" aria-hidden="true">🍷</span>
            </div>
          </div>

          {/* 404 Title */}
          <h1 className="font-serif text-7xl md:text-9xl font-bold text-gradient-wine mb-4">
            404
          </h1>

          {/* Message */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            Oups ! Cette page semble avoir été dégustée...
          </p>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            La page que vous recherchez n'existe pas ou a été déplacée.
            Pas d'inquiétude, il y a encore plein de bons vins à découvrir !
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button asChild className="bg-gradient-wine gap-2">
              <Link to="/">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>

          {/* Quick Links */}
          <div className="border-t border-border pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Ou explorez nos sections populaires :
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link 
                to="/search" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Search className="h-4 w-4" />
                Rechercher
              </Link>
              <Link 
                to="/events" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Calendar className="h-4 w-4" />
                Événements
              </Link>
              <Link 
                to="/learning" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Cours
              </Link>
              <Link 
                to="/feed" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Wine className="h-4 w-4" />
                Fil d'actualité
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
