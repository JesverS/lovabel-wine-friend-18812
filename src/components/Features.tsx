import { Sparkles, MapPin, Users, Calendar } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "IA Sommelier",
    description: "Notre intelligence artificielle analyse vos goûts et vos plats pour vous recommander le vin parfait en quelques secondes.",
  },
  {
    icon: MapPin,
    title: "Disponibilité locale",
    description: "Trouvez instantanément les bouteilles disponibles près de chez vous ou en livraison directe depuis les domaines.",
  },
  {
    icon: Users,
    title: "Communauté passionnée",
    description: "Partagez vos découvertes, suivez des cavistes et domaines, et inspirez-vous des suggestions de la communauté.",
  },
  {
    icon: Calendar,
    title: "Évènements exclusifs",
    description: "Participez à des dégustations, rencontrez des vignerons et découvrez des cuvées exceptionnelles en avant-première.",
  },
];

export const Features = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            L'expérience <span className="text-gradient-wine">Lovabel</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Une nouvelle façon de découvrir, apprendre et partager votre passion du vin
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="text-center space-y-4 p-6 rounded-2xl hover:bg-accent/50 transition-colors animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-wine">
                  <Icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
