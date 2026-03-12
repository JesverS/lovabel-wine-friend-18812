import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';

export default function Badges() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Badges & Récompenses | Collection - Wine Note</title>
        <meta name="description" content="Débloquez des badges en progressant dans l'application Wine Note. Chaque badge vous récompense avec de l'XP et célèbre vos accomplissements œnologiques." />
        <link rel="canonical" href="https://winenote.me/badges" />
        <meta property="og:title" content="Badges & Récompenses - Wine Note" />
        <meta property="og:description" content="Collectionnez des badges et gagnez de l'XP en explorant le monde du vin." />
        <meta property="og:url" content="https://winenote.me/badges" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-5xl pt-32 flex-grow">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Badges</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">🏆 Collection de Badges</h1>
          <p className="text-muted-foreground">
            {user 
              ? "Débloquez des badges en progressant dans l'application. Chaque badge vous récompense avec de l'XP !"
              : "Connectez-vous pour commencer à collectionner des badges et gagner de l'XP."
            }
          </p>
        </div>

        {user ? (
          <BadgeGrid showFilters={true} />
        ) : (
          <div className="text-center py-16 bg-card rounded-lg border">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-xl font-semibold mb-2">Connectez-vous pour voir vos badges</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Créez un compte ou connectez-vous pour commencer à collectionner des badges 
              et suivre votre progression.
            </p>
            <Button asChild>
              <Link to="/auth">
                <LogIn className="w-4 h-4 mr-2" />
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
