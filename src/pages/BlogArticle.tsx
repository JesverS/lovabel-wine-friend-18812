import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogCard } from "@/components/BlogCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Calendar, Clock, ArrowLeft, Share2, Twitter, Facebook, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const BlogArticle = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_article")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch related articles
  const { data: relatedArticles } = useQuery({
    queryKey: ["blog-articles-related", article?.category, article?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_article")
        .select("*")
        .eq("is_published", true)
        .eq("category", article!.category)
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!article?.category && !!article?.id,
  });

  const estimateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  };

  const shareUrl = `https://winenote.me/blog/${slug}`;

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.title,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-12 w-full max-w-2xl mb-8" />
          <Skeleton className="h-80 w-full max-w-4xl mb-8" />
          <div className="space-y-4 max-w-3xl">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Article non trouvé | Wine Note</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header />
        <main className="flex-grow container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h1 className="text-2xl font-bold mb-4">Article non trouvé</h1>
          <p className="text-muted-foreground mb-8">
            Cet article n'existe pas ou n'est plus disponible.
          </p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const readingTime = estimateReadingTime(article.content);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    image: article.cover_image || "https://winenote.me/wine-note-favicon.png",
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      "@type": "Organization",
      name: "Wine Note",
    },
    publisher: {
      "@type": "Organization",
      name: "Wine Note",
      logo: {
        "@type": "ImageObject",
        url: "https://winenote.me/wine-note-favicon.png",
      },
    },
    description: article.meta_description || article.excerpt || article.title,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": shareUrl,
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{article.meta_title || article.title} | Wine Note Blog</title>
        <meta
          name="description"
          content={article.meta_description || article.excerpt || article.title}
        />
        <meta property="og:title" content={article.meta_title || article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt || ""} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        {article.cover_image && <meta property="og:image" content={article.cover_image} />}
        <meta property="article:published_time" content={article.published_at || ""} />
        <meta property="article:modified_time" content={article.updated_at} />
        <link rel="canonical" href={shareUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <Header />

      <main className="flex-grow">
        {/* Breadcrumbs */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">
                Accueil
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <Link to="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <ChevronRight className="h-4 w-4 mx-2" />
              <span className="text-foreground truncate max-w-[200px]">{article.title}</span>
            </nav>
          </div>
        </div>

        {/* Article Header */}
        <article className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Category */}
            <Badge variant="secondary" className="mb-4">
              {article.category}
            </Badge>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8">
              {article.published_at && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(article.published_at), "d MMMM yyyy", { locale: fr })}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {readingTime} min de lecture
              </span>
            </div>

            {/* Cover Image */}
            {article.cover_image && (
              <div className="mb-10 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-auto max-h-[500px] object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {article.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t">
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Share */}
            <div className="mt-10 pt-6 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">Partager cet article</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Partager sur Twitter"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Partager sur Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Partager sur LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="bg-muted/30 py-16">
            <div className="container mx-auto px-4">
              <h2 className="font-serif text-2xl font-bold text-foreground mb-8 text-center">
                Articles similaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {relatedArticles.map((related) => (
                  <BlogCard
                    key={related.id}
                    slug={related.slug}
                    title={related.title}
                    excerpt={related.excerpt}
                    coverImage={related.cover_image}
                    category={related.category}
                    publishedAt={related.published_at}
                    readingTime={estimateReadingTime(related.content)}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Back to blog */}
        <div className="container mx-auto px-4 py-8 text-center">
          <Button variant="outline" asChild>
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogArticle;
