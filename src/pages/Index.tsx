import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { WineExperiences } from "@/components/WineExperiences";
import { FeaturedWines } from "@/components/FeaturedWines";
import { SocialFeed } from "@/components/SocialFeed";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>Wine Note - Découvrez, Partagez et Apprenez le Vin</title>
        <meta 
          name="description" 
          content="Wine Note est la plateforme sociale dédiée aux amateurs de vin. Cours interactifs, dégustations entre amis, caves personnalisées et événements œnologiques." 
        />
        <meta property="og:title" content="Wine Note - Découvrez, Partagez et Apprenez le Vin" />
        <meta property="og:description" content="La plateforme sociale dédiée aux amateurs de vin. Cours, dégustations, caves et événements." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/1EK7H96ITKXD3CrC1aSkRhKBhvC2/social-images/social-1765190887528-icon.png" />
        <link rel="canonical" href="https://winenote.me" />
      </Helmet>
      <Header />
      <main className="flex-grow min-h-screen">
        <Hero />
        <Features />
        <WineExperiences />
        <FeaturedWines />
        <SocialFeed />
      </main>
      <Footer />
    </div>
  );
};

export default Index;