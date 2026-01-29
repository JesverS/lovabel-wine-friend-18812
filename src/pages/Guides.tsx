import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Wine, Thermometer, GlassWater, Grape, UtensilsCrossed } from "lucide-react";

const guides = [
  {
    id: 1,
    title: "Accords mets et vins",
    description: "Maîtrisez l'art de marier les saveurs pour sublimer vos repas",
    icon: UtensilsCrossed,
    color: "text-red-500",
    tips: [
      "Rouge charpenté avec viandes rouges grillées",
      "Blanc sec avec poissons et fruits de mer",
      "Champagne en apéritif ou avec des huîtres",
      "Rosé frais pour les salades d'été"
    ]
  },
  {
    id: 2,
    title: "Conservation du vin",
    description: "Les secrets pour préserver vos bouteilles dans les meilleures conditions",
    icon: Thermometer,
    color: "text-blue-500",
    tips: [
      "Température idéale : 12-14°C",
      "Humidité entre 70% et 80%",
      "Bouteilles couchées pour les vins bouchés",
      "À l'abri de la lumière et des vibrations"
    ]
  },
  {
    id: 3,
    title: "L'art de la dégustation",
    description: "Apprenez à analyser un vin comme un professionnel",
    icon: GlassWater,
    color: "text-purple-500",
    tips: [
      "L'œil : couleur, limpidité, brillance",
      "Le nez : arômes primaires, secondaires, tertiaires",
      "La bouche : attaque, milieu, finale",
      "Servir les blancs à 8-12°C, les rouges à 16-18°C"
    ]
  },
  {
    id: 4,
    title: "Les cépages français",
    description: "Découvrez les variétés de raisins qui font la richesse du vignoble français",
    icon: Grape,
    color: "text-green-500",
    tips: [
      "Cabernet Sauvignon : structure et tanins",
      "Pinot Noir : finesse et élégance",
      "Chardonnay : polyvalence et richesse",
      "Sauvignon Blanc : fraîcheur et vivacité"
    ]
  },
  {
    id: 5,
    title: "Vocabulaire du vin",
    description: "Les termes essentiels pour parler du vin avec précision",
    icon: BookOpen,
    color: "text-amber-500",
    tips: [
      "Tannins : sensation d'astringence en bouche",
      "Robe : aspect visuel du vin dans le verre",
      "Longueur : persistance des arômes après dégustation",
      "Millésime : année de récolte du raisin"
    ]
  },
  {
    id: 6,
    title: "Choisir son vin",
    description: "Conseils pratiques pour ne jamais se tromper lors de l'achat",
    icon: Wine,
    color: "text-primary",
    tips: [
      "Définir l'occasion et le budget",
      "Privilégier les appellations reconnues",
      "Demander conseil au caviste",
      "Oser découvrir de nouvelles régions"
    ]
  }
];

export default function Guides() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Guides & Conseils Vin - Wine Note</title>
        <meta 
          name="description" 
          content="Découvrez nos guides pratiques sur le vin : accords mets-vins, conservation, dégustation, cépages et conseils d'achat." 
        />
        <link rel="canonical" href="https://winenote.me/guides" />
        <meta property="og:title" content="Guides & Conseils Vin - Wine Note" />
        <meta property="og:description" content="Tout ce qu'il faut savoir pour apprécier le vin comme un expert." />
        <meta property="og:url" content="https://winenote.me/guides" />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-8 pt-28 flex-grow">
        {/* Header Section */}
        <div className="mb-12 animate-fade-up text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="h-10 w-10 text-primary" />
            <h1 className="font-serif text-3xl md:text-5xl font-bold">
              Guides & <span className="text-gradient-wine">Conseils</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tout ce qu'il faut savoir pour apprécier le vin comme un expert, 
            de la conservation à la dégustation
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((guide, index) => {
            const IconComponent = guide.icon;
            return (
              <Card 
                key={guide.id} 
                className="group hover:border-primary/50 transition-all duration-300 hover-lift animate-fade-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${guide.color}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {guide.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {guide.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {guide.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <h2 className="font-serif text-2xl font-bold mb-2">
            Envie d'aller plus loin ?
          </h2>
          <p className="text-muted-foreground mb-4">
            Découvrez nos cours interactifs pour approfondir vos connaissances
          </p>
          <a 
            href="/learning" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-wine text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <BookOpen className="h-5 w-5" />
            Accéder aux cours
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}