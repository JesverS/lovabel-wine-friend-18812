import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { WineExperiences } from "@/components/WineExperiences";
import { FeaturedWines } from "@/components/FeaturedWines";
import { SocialFeed } from "@/components/SocialFeed";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
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
