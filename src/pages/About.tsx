import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, BookOpen, Wine } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Notre <span className="text-gradient-wine">Histoire</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Une passion pour le vin, transformée en plateforme de partage et d'apprentissage
          </p>
        </div>

        {/* Mission Section */}
        <Card className="mb-8 animate-fade-up glass-card">
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Wine className="h-8 w-8 text-primary" />
              Notre Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg space-y-4">
            <p>
              Wine Note est née de la volonté de démocratiser l'univers du vin et de créer une communauté 
              où passionnés et amateurs peuvent échanger, apprendre et découvrir ensemble.
            </p>
            <p>
              Nous croyons que le vin est bien plus qu'une boisson : c'est un art, une culture, 
              un patrimoine à préserver et à partager. Notre plateforme permet à chacun de gérer sa cave, 
              de participer à des événements, et d'approfondir ses connaissances à travers des cours interactifs.
            </p>
          </CardContent>
        </Card>

        {/* Values Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="glass-card hover:scale-105 transition-transform">
            <CardHeader>
              <Heart className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Passion</CardTitle>
              <CardDescription>
                Le vin est notre passion, et nous la partageons avec authenticité et enthousiasme
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card hover:scale-105 transition-transform">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Communauté</CardTitle>
              <CardDescription>
                Nous créons des liens entre amateurs et professionnels du monde viticole
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card hover:scale-105 transition-transform">
            <CardHeader>
              <BookOpen className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Apprentissage</CardTitle>
              <CardDescription>
                Nous rendons la connaissance du vin accessible à tous, de manière ludique et interactive
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Story Section */}
        <Card className="glass-card animate-fade-up">
          <CardHeader>
            <CardTitle className="text-3xl">Notre Parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-l-4 border-primary pl-6 py-2">
              <h3 className="text-xl font-semibold mb-2">Le Commencement</h3>
              <p className="text-muted-foreground">
                Tout a commencé par une simple idée : créer un espace où les amateurs de vin 
                pourraient facilement gérer leur collection et découvrir de nouveaux domaines.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-6 py-2">
              <h3 className="text-xl font-semibold mb-2">L'Évolution</h3>
              <p className="text-muted-foreground">
                Au fil du temps, Wine Note est devenu bien plus qu'un gestionnaire de cave : 
                une véritable plateforme sociale dédiée à l'œnologie, avec des événements, 
                des cours et une communauté grandissante.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-6 py-2">
              <h3 className="text-xl font-semibold mb-2">Aujourd'hui</h3>
              <p className="text-muted-foreground">
                Nous continuons d'innover et d'enrichir notre plateforme pour offrir 
                la meilleure expérience possible à tous les passionnés de vin, 
                qu'ils soient débutants ou experts.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
