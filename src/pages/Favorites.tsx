import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UserFavorites } from "@/components/UserFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Heart, LogIn, Wine } from "lucide-react";

export default function Favorites() {
  const { user, loading } = useAuth();

  // Redirect to auth if not logged in
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Mes Favoris - Wine Note</title>
        <meta 
          name="description" 
          content="Retrouvez tous les vins que vous avez aimés sur Wine Note. Gérez votre collection de vins favoris." 
        />
        <meta property="og:title" content="Mes Favoris - Wine Note" />
        <meta property="og:description" content="Retrouvez tous les vins que vous avez aimés sur Wine Note." />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-8 pt-28 flex-grow">
        {/* Header Section */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              Mes <span className="text-gradient-wine">Favoris</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            Retrouvez tous les vins que vous avez aimés
          </p>
        </div>

        {/* Favorites Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : user ? (
          <UserFavorites />
        ) : (
          <div className="text-center py-20">
            <Wine className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connexion requise</h2>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour voir vos vins favoris
            </p>
            <Button asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter
              </Link>
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}