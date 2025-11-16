import { Card } from "@/components/ui/card";

export const FeaturedWines = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Sélection de la semaine
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez bientôt les coups de cœur de notre communauté et de nos sommeliers partenaires
          </p>
        </div>

        <div className="max-w-2xl mx-auto animate-fade-up">
          <Card className="p-12 text-center bg-gradient-to-br from-background to-muted/50 border-2 border-dashed border-muted-foreground/20">
            <div className="text-7xl mb-6">🏗️</div>
            <h3 className="text-2xl font-bold mb-3">Disponible prochainement</h3>
            <p className="text-muted-foreground text-lg">
              Notre équipe travaille activement pour vous proposer une sélection exceptionnelle de vins. Revenez très bientôt !
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
