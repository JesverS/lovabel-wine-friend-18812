import { GraduationCap, Wine, BookOpen, Target, Award, Users, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const WineExperiences = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-muted/30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-up">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-3">
            Explorez & Progressez
          </p>
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Apprenez et <span className="text-gradient-wine">Jouez</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Découvrez le monde du vin de façon ludique et conviviale
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Mode Apprentissage */}
          <div
            onClick={() => navigate("/learning")}
            className="group relative rounded-2xl bg-card border border-border/60 p-8 cursor-pointer transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 animate-fade-up"
          >
            {/* Decorative gradient blob */}
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />

            <div className="relative flex flex-col h-full">
              {/* Icon + Label row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors duration-300">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold leading-tight">
                    Mode Apprentissage
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Progressez à votre rythme</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Progressez par niveaux et thèmes : régions, cépages, domaines, dégustation. 
                Flashcards interactives et quiz pour apprendre en s'amusant.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <BookOpen className="h-3 w-3" />Cours
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <Target className="h-3 w-3" />Quiz
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <Award className="h-3 w-3" />Badges
                </span>
              </div>

              {/* CTA */}
              <div className="mt-auto">
                <Button
                  size="lg"
                  className="w-full bg-gradient-wine hover:opacity-90 transition-opacity text-primary-foreground group/btn"
                  onClick={(e) => { e.stopPropagation(); navigate("/learning"); }}
                >
                  Commencer à apprendre
                  <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mode Jeu */}
          <div
            onClick={() => navigate("/game")}
            className="group relative rounded-2xl bg-card border border-border/60 p-8 cursor-pointer transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            {/* Decorative gradient blob */}
            <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />

            <div className="relative flex flex-col h-full">
              {/* Icon + Label row */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors duration-300">
                  <Wine className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-semibold leading-tight">
                    Soirée Vin
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Jeu multijoueur convivial</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                De 1 à 8 joueurs sur un seul téléphone. Questions culture générale et ressentis. 
                Parfait pour animer vos dégustations entre amis !
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-8">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <Users className="h-3 w-3" />1-8 joueurs
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <Wine className="h-3 w-3" />Dégustation
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/10">
                  <Sparkles className="h-3 w-3" />Convivial
                </span>
              </div>

              {/* CTA */}
              <div className="mt-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all group/btn"
                  onClick={(e) => { e.stopPropagation(); navigate("/game"); }}
                >
                  Lancer une partie
                  <ArrowRight className="h-4 w-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
