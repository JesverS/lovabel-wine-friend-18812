import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SocialFeed } from "@/components/SocialFeed";
import { CreatePost } from "@/components/CreatePost";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn, MessageSquare } from "lucide-react";

export default function Feed() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 pt-28 flex-grow">
        {/* Header Section */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              Fil d'<span className="text-gradient-wine">actualité</span>
            </h1>
          </div>
          <p className="text-muted-foreground">
            Découvrez les dernières dégustations et partages de la communauté
          </p>
        </div>

        {/* Create Post Section */}
        {user ? (
          <div className="mb-8">
            <CreatePost onPostCreated={() => window.location.reload()} />
          </div>
        ) : (
          <div className="mb-8 p-6 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <p className="text-muted-foreground mb-4">
              Connectez-vous pour partager vos dégustations avec la communauté
            </p>
            <Button asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter
              </Link>
            </Button>
          </div>
        )}

        {/* Social Feed */}
        <SocialFeed />
      </main>

      <Footer />
    </div>
  );
}
