import { Heart, MessageCircle, Share2, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const POSTS = [
  {
    id: 1,
    author: {
      name: "Sophie Martin",
      username: "@sophiewine",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    },
    content: "Soirée parfaite avec ce Châteauneuf-du-Pape ! L'accord avec l'agneau était juste magique 🍷✨",
    wine: {
      name: "Châteauneuf-du-Pape 2019",
      domain: "Domaine du Vieux Télégraphe",
    },
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800",
    likes: 127,
    comments: 23,
    timestamp: "Il y a 2h",
  },
  {
    id: 2,
    author: {
      name: "Cave de Belleville",
      username: "@cavebelleville",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=CB",
    },
    content: "Nouvelle arrivée en boutique ! Une pépite de la Vallée du Rhône à découvrir absolument. Stock limité ! 🍾",
    wine: {
      name: "Côte-Rôtie La Turque",
      domain: "E. Guigal",
    },
    image: "https://images.unsplash.com/photo-1566754436464-e5e9e242481a?w=800",
    likes: 89,
    comments: 12,
    timestamp: "Il y a 5h",
  },
];

export const SocialFeed = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">
            La communauté Lovabel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les dernières trouvailles et recommandations de nos membres
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {POSTS.map((post) => (
            <Card key={post.id} className="overflow-hidden hover-lift animate-fade-up">
              <CardContent className="p-6 space-y-4">
                {/* Author Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.author.name}</p>
                      <p className="text-sm text-muted-foreground">{post.author.username}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{post.timestamp}</span>
                </div>

                {/* Content */}
                <p className="text-foreground">{post.content}</p>

                {/* Wine Tag */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border">
                  <Wine className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{post.wine.name}</p>
                    <p className="text-xs text-muted-foreground">{post.wine.domain}</p>
                  </div>
                </div>

                {/* Image */}
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img 
                    src={post.image}
                    alt={post.wine.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-2">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{post.likes}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{post.comments}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button size="lg" variant="outline" className="hover-lift">
            Voir plus de posts
          </Button>
        </div>
      </div>
    </section>
  );
};
