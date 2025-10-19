import { WineCard } from "./WineCard";

const FEATURED_WINES = [
  {
    id: 1,
    name: "Château Margaux",
    domain: "Château Margaux",
    year: 2018,
    region: "Margaux, Bordeaux",
    price: 645,
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800",
    available: true,
    distance: "2.5 km",
    tags: ["Corsé", "Tannique", "Garde"],
  },
  {
    id: 2,
    name: "Chablis Grand Cru",
    domain: "Domaine William Fèvre",
    year: 2020,
    region: "Chablis, Bourgogne",
    price: 85,
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800",
    available: true,
    distance: "1.8 km",
    tags: ["Minéral", "Frais", "Élégant"],
  },
  {
    id: 3,
    name: "Châteauneuf-du-Pape",
    domain: "Domaine du Vieux Télégraphe",
    year: 2019,
    region: "Châteauneuf-du-Pape, Rhône",
    price: 65,
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1566754436464-e5e9e242481a?w=800",
    available: false,
    tags: ["Puissant", "Épicé", "Complexe"],
  },
  {
    id: 4,
    name: "Puligny-Montrachet",
    domain: "Domaine Leflaive",
    year: 2021,
    region: "Côte de Beaune, Bourgogne",
    price: 120,
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?w=800",
    available: true,
    distance: "3.2 km",
    tags: ["Raffiné", "Boisé", "Longue finale"],
  },
];

export const FeaturedWines = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            Sélection de la semaine
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les coups de cœur de notre communauté et de nos sommeliers partenaires
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_WINES.map((wine) => (
            <div key={wine.id} className="animate-fade-up">
              <WineCard {...wine} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
