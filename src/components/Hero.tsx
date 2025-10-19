import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-wine.jpg";

export const Hero = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage}
          alt="Elegant wine collection"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 mb-4">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm text-secondary font-medium">Recommandations IA personnalisées</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold text-primary-foreground leading-tight text-balance">
            Trouvez le vin parfait pour
            <span className="text-gradient-gold"> chaque moment</span>
          </h1>

          <p className="text-xl md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto text-balance">
            Dites-nous ce que vous mangez, notre IA sommelier vous trouve la bouteille idéale, 
            disponible près de chez vous ou en livraison directe.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-12">
            <div className="flex flex-col md:flex-row gap-3 glass-card p-3 rounded-2xl">
              <Input
                type="text"
                placeholder="Que voulez-vous manger ou boire ce soir ?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 border-0 bg-transparent text-primary-foreground placeholder:text-primary-foreground/60 text-lg focus-visible:ring-0"
              />
              <Button 
                type="submit"
                size="lg"
                className="bg-gradient-wine hover:opacity-90 transition-opacity px-8 font-medium whitespace-nowrap"
              >
                Trouver mon vin
              </Button>
            </div>
          </form>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <span className="text-sm text-primary-foreground/70">Suggestions :</span>
            {["Bœuf bourguignon", "Plateau de fromages", "Saumon grillé", "Soirée apéro"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                }}
                className="px-4 py-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 
                         text-primary-foreground text-sm font-medium transition-colors backdrop-blur-sm
                         border border-primary-foreground/20"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-gentle">
        <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
};
