import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Wine } from "lucide-react";
import { WineCard } from "@/components/WineCard";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MOCK_RECOMMENDATIONS = [
  {
    id: 1,
    name: "Côte-Rôtie La Turque",
    domain: "E. Guigal",
    year: 2019,
    region: "Vallée du Rhône",
    price: 285,
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1566754436464-e5e9e242481a?w=800",
    available: true,
    distance: "2.1 km",
    tags: ["Puissant", "Épicé", "Élégant"],
  },
  {
    id: 2,
    name: "Saint-Joseph Les Granits",
    domain: "Domaine Courbis",
    year: 2020,
    region: "Vallée du Rhône",
    price: 42,
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800",
    available: true,
    distance: "1.5 km",
    tags: ["Fruité", "Structuré", "Souple"],
  },
];

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Excellent choix ! Pour "${initialQuery}", j'ai quelques questions rapides :` },
    { role: "assistant", content: "1. Préférez-vous un vin rouge ou blanc ?\n2. Quel est votre budget par bouteille ?\n3. C'est pour une occasion spéciale ou un repas quotidien ?" }
  ]);
  
  const [input, setInput] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user" as const, content: input }];
    setMessages(newMessages);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      if (newMessages.length < 6) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: "Parfait ! Laissez-moi trouver les meilleures options disponibles près de chez vous..."
          }
        ]);
        
        setTimeout(() => {
          setShowRecommendations(true);
        }, 1000);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="max-w-3xl mx-auto mb-8 text-center animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">IA Sommelier en action</span>
            </div>
            <h1 className="font-serif text-4xl font-bold mb-3">
              Trouvons le vin parfait pour vous
            </h1>
            <p className="text-muted-foreground">
              Je vous pose quelques questions pour affiner la recommandation
            </p>
          </div>

          {/* Chat Interface */}
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="border-2 shadow-lg">
              <CardContent className="p-6">
                {/* Messages */}
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                      } animate-fade-in`}
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          message.role === "assistant"
                            ? "bg-gradient-wine"
                            : "bg-gradient-gold"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Wine className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <span className="text-sm font-bold text-slate">U</span>
                        )}
                      </div>
                      <div
                        className={`flex-1 p-4 rounded-2xl ${
                          message.role === "user"
                            ? "bg-gradient-gold text-slate"
                            : "bg-accent"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Votre réponse..."
                    className="flex-1"
                    disabled={showRecommendations}
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="bg-gradient-wine hover:opacity-90"
                    disabled={showRecommendations}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {showRecommendations && (
            <div className="max-w-6xl mx-auto animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="font-serif text-3xl font-bold mb-3">
                  Mes recommandations pour vous
                </h2>
                <p className="text-muted-foreground">
                  Basées sur vos préférences et disponibles près de chez vous
                </p>
              </div>

              {/* Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {MOCK_RECOMMENDATIONS.map((wine, index) => (
                  <div 
                    key={wine.id}
                    className="animate-scale-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card className="hover-lift overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <div className="relative w-32 h-40 flex-shrink-0 rounded-lg overflow-hidden">
                            <img 
                              src={wine.imageUrl}
                              alt={wine.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="font-serif font-semibold text-xl mb-1">
                                {wine.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {wine.domain} • {wine.year}
                              </p>
                              <p className="text-xs text-slate-light mt-1">{wine.region}</p>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {wine.tags.map((tag, i) => (
                                <span 
                                  key={i}
                                  className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            <div className="pt-3 border-t flex items-center justify-between">
                              <div>
                                <p className="text-2xl font-bold text-primary">{wine.price}€</p>
                                <p className="text-xs text-muted-foreground">Dispo à {wine.distance}</p>
                              </div>
                              <Button className="bg-gradient-wine hover:opacity-90">
                                Commander
                              </Button>
                            </div>
                          </div>
                        </div>

                        {index === 0 && (
                          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm text-slate">
                              <strong className="text-primary">Pourquoi ce choix ?</strong><br />
                              Ce Côte-Rôtie complète parfaitement un bœuf bourguignon grâce à sa structure tannique 
                              et ses notes épicées. Un grand vin dans votre budget, disponible chez Cave de Belleville.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => navigate("/")}
                >
                  Nouvelle recherche
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
