import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogCard } from "@/components/BlogCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Wine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = [
  { value: "all", label: "Tous" },
  { value: "tutoriel", label: "Tutoriels" },
  { value: "actualite", label: "Actualités" },
  { value: "conseil", label: "Conseils" },
  { value: "decouverte", label: "Découvertes" },
];

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-articles", selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("blog_article")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Estimate reading time based on content length
  const estimateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Blog Vin - Conseils, Actualités & Tutoriels | Wine Note</title>
        <meta
          name="description"
          content="Découvrez nos articles sur le vin : tutoriels pour utiliser Wine Note, conseils de dégustation, actualités œnologiques et découvertes de domaines."
        />
        <meta property="og:title" content="Blog Vin - Conseils & Actualités | Wine Note" />
        <meta property="og:description" content="Articles, tutoriels et conseils pour les amateurs de vin." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me/blog" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/1EK7H96ITKXD3CrC1aSkRhKBhvC2/social-images/social-1765190887528-icon.png" />
        <link rel="canonical" href="https://winenote.me/blog" />
      </Helmet>

      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <Wine className="h-5 w-5" />
                <span className="font-medium">Le Blog Wine Note</span>
              </div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
                Conseils, Tutoriels & Actualités
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Explorez nos articles pour tirer le meilleur parti de Wine Note et approfondir vos connaissances œnologiques.
              </p>

              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher un article..."
                  className="pl-10 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-8 border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {articles.map((article) => (
                  <BlogCard
                    key={article.id}
                    slug={article.slug}
                    title={article.title}
                    excerpt={article.excerpt}
                    coverImage={article.cover_image}
                    category={article.category}
                    publishedAt={article.published_at}
                    readingTime={estimateReadingTime(article.content)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Aucun article trouvé
                </h2>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Aucun article ne correspond à votre recherche."
                    : "Les premiers articles arrivent bientôt !"}
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Blog;
