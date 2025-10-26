import { GraduationCap, Wine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const WineExperiences = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Apprenez et <span className="text-gradient-wine">Jouez</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez le monde du vin de façon ludique et conviviale
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Mode Cours */}
          <Card className="group overflow-hidden border-2 hover:border-primary transition-all duration-300 hover-lift animate-fade-up">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-wine opacity-20 blur-2xl rounded-full" />
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-wine">
                    <GraduationCap className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-semibold">
                    Mode Apprentissage
                  </h3>
                  <p className="text-muted-foreground">
                    Progressez par niveaux et thèmes : régions, cépages, domaines, dégustation. 
                    Inspiré de Duolingo avec flashcards interactives et quiz.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="badge-wine">📚 Cours interactifs</span>
                  <span className="badge-wine">🎯 Quiz</span>
                  <span className="badge-wine">🏆 Badges</span>
                </div>

                <Button
                  onClick={() => navigate("/learning")}
                  size="lg"
                  className="w-full bg-gradient-wine hover:opacity-90 transition-opacity text-primary-foreground"
                >
                  Commencer à apprendre
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mode Jeu */}
          <Card className="group overflow-hidden border-2 hover:border-secondary transition-all duration-300 hover-lift animate-fade-up" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-gold opacity-20 blur-2xl rounded-full" />
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-gold">
                    <Wine className="h-10 w-10 text-slate" />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-semibold">
                    Soirée Vin - Jeu Multijoueur
                  </h3>
                  <p className="text-muted-foreground">
                    De 1 à 8 joueurs sur un seul téléphone. Questions culture générale et ressentis. 
                    Parfait pour animer vos dégustations entre amis !
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="badge-gold">👥 1-8 joueurs</span>
                  <span className="badge-gold">🍷 Dégustation</span>
                  <span className="badge-gold">🎉 Convivial</span>
                </div>

                <Button
                  onClick={() => navigate("/game")}
                  size="lg"
                  className="w-full bg-gradient-gold hover:opacity-90 transition-opacity text-slate font-semibold"
                >
                  Lancer une partie
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
