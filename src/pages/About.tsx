import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import aboutHeroImage from "@/assets/about-hero-vineyard.jpg";
import founderImage from "@/assets/founder-jg-segard.jpg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Users, 
  BookOpen, 
  Wine, 
  GraduationCap, 
  Gamepad2, 
  Calendar, 
  Archive,
  UserPlus,
  Search,
  Share2,
  PartyPopper,
  ArrowRight,
  Grape,
  Smartphone,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMobilePlatform, APP_STORE_URL, ANDROID_BETA_URL } from "@/lib/mobileAppUtils";

const FEATURES = [
  {
    icon: Users,
    title: "Réseau Social",
    description: "Partagez vos découvertes œnologiques, suivez des passionnés et échangez avec une communauté bienveillante.",
    gradient: "from-rose-500 to-pink-600"
  },
  {
    icon: Wine,
    title: "Dégustations",
    description: "Notez chaque vin dégusté, gardez une trace de vos impressions et retrouvez facilement vos coups de cœur.",
    gradient: "from-amber-500 to-orange-600"
  },
  {
    icon: GraduationCap,
    title: "Cours d'Œnologie",
    description: "Apprenez à votre rythme avec des leçons interactives et des quiz pour tester vos connaissances.",
    gradient: "from-emerald-500 to-teal-600"
  },
  {
    icon: Gamepad2,
    title: "Jeux Éducatifs",
    description: "Testez vos connaissances avec des jeux de dégustation à l'aveugle, de 1 à 8 joueurs, pour tous les niveaux.",
    gradient: "from-violet-500 to-purple-600"
  },
  {
    icon: Calendar,
    title: "Événements",
    description: "Découvrez des dégustations près de chez vous, organisez vos propres événements et rencontrez d'autres amateurs.",
    gradient: "from-sky-500 to-blue-600"
  },
  {
    icon: Archive,
    title: "Caves Virtuelles",
    description: "Gérez votre collection de vins, suivez l'évolution de votre cave et partagez-la avec vos proches.",
    gradient: "from-slate-500 to-slate-700"
  }
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Inscrivez-vous gratuitement en quelques secondes et personnalisez votre profil."
  },
  {
    icon: Search,
    title: "Explorez & Apprenez",
    description: "Parcourez les cours d'œnologie, découvrez des domaines et enrichissez vos connaissances."
  },
  {
    icon: Share2,
    title: "Partagez vos dégustations",
    description: "Notez vos vins, publiez vos impressions et échangez avec la communauté."
  },
  {
    icon: PartyPopper,
    title: "Participez & Célébrez",
    description: "Rejoignez des événements, organisez des soirées et vivez votre passion pleinement."
  }
];

const VALUES = [
  {
    icon: Heart,
    title: "Passion",
    description: "Le vin est notre passion, et nous la partageons avec authenticité et enthousiasme à travers chaque fonctionnalité."
  },
  {
    icon: Users,
    title: "Communauté",
    description: "Nous créons des liens entre amateurs et professionnels du monde viticole, dans un esprit de partage et de convivialité."
  },
  {
    icon: BookOpen,
    title: "Apprentissage",
    description: "Nous rendons la connaissance du vin accessible à tous, de manière ludique, interactive et sans prétention."
  }
];

function MobileAppBanner() {
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  // Auto-redirect iOS users to the App Store after 1s
  useEffect(() => {
    if (platform !== 'ios') return;
    const timer = setTimeout(() => {
      window.location.href = APP_STORE_URL;
    }, 1000);
    return () => clearTimeout(timer);
  }, [platform]);

  if (platform === 'ios') {
    return (
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl bg-foreground/10 backdrop-blur-md border border-foreground/20 px-5 py-3 mb-6 transition-colors hover:bg-foreground/20"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-foreground/10">
          <Smartphone className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Disponible sur iPhone</p>
          <p className="text-xs text-muted-foreground">Téléchargez WineNote sur l'App Store</p>
        </div>
        <Download className="h-5 w-5 text-primary" />
      </a>
    );
  }

  if (platform === 'android') {
    return (
      <a
        href={ANDROID_BETA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl bg-foreground/10 backdrop-blur-md border border-foreground/20 px-5 py-3 mb-6 transition-colors hover:bg-foreground/20"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-foreground/10">
          <Smartphone className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Bientôt disponible sur Android</p>
          <p className="text-xs text-muted-foreground">Rejoignez notre programme de bêta test !</p>
        </div>
        <ArrowRight className="h-5 w-5 text-primary" />
      </a>
    );
  }

  return null;
}

export default function About() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartClick = () => {
    if (user) {
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>À propos de Wine Note - Notre Mission & Valeurs</title>
        <meta name="description" content="Découvrez Wine Note, la plateforme qui démocratise l'univers du vin. Notre mission : rendre l'œnologie accessible, ludique et conviviale pour tous." />
        <link rel="canonical" href="https://winenote.me/about" />
        <meta property="og:title" content="À propos de Wine Note" />
        <meta property="og:description" content="La plateforme qui réinvente votre passion du vin" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me/about" />
      </Helmet>
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <img 
              src={aboutHeroImage} 
              alt="Vignoble au coucher de soleil" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          </div>
          
          <div className="relative z-10 container mx-auto px-4 text-center animate-fade-up">
            <Badge className="badge-wine mb-6 text-sm px-4 py-2">
              <Grape className="w-4 h-4 mr-2" />
              Bienvenue sur WineNote
            </Badge>

            {/* Mobile App Banner — shown only on mobile */}
            <div className="max-w-sm mx-auto">
              <MobileAppBanner />
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
              Découvrez <span className="text-gradient-wine">WineNote</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
              La plateforme qui réinvente votre passion du vin : apprenez, partagez, dégustez et célébrez ensemble.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleStartClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                {user ? "Accéder à WineNote" : "Commencer gratuitement"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/learning")}
              >
                Explorer les cours
              </Button>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center animate-fade-up">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Wine className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Notre <span className="text-gradient-wine">Mission</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-6">
                WineNote est née de la volonté de <strong className="text-foreground">démocratiser l'univers du vin</strong> et de créer une communauté 
                où passionnés et amateurs peuvent échanger, apprendre et découvrir ensemble.
              </p>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Nous croyons que le vin est bien plus qu'une boisson : c'est un <strong className="text-foreground">art, une culture, 
                un patrimoine</strong> à préserver et à partager. Notre plateforme permet à chacun de gérer sa cave, 
                de participer à des événements, et d'approfondir ses connaissances à travers des cours interactifs.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-up">
              <Badge className="badge-gold mb-4">Fonctionnalités</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Tout ce que <span className="text-gradient-gold">WineNote</span> vous offre
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Une suite complète d'outils pour vivre pleinement votre passion du vin.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, index) => (
                <Card 
                  key={feature.title} 
                  className="glass-card hover-lift group animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-up">
              <Badge className="badge-wine mb-4">Comment ça marche</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Lancez-vous en <span className="text-gradient-wine">4 étapes</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Rejoindre la communauté WineNote n'a jamais été aussi simple.
              </p>
            </div>

            <div className="relative max-w-5xl mx-auto">
              {/* Connector line for desktop */}
              <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {STEPS.map((step, index) => (
                  <div 
                    key={step.title} 
                    className="relative text-center animate-fade-up"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary/20 mb-4 shadow-lg">
                      <step.icon className="h-7 w-7 text-primary" />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-up">
              <Badge className="badge-gold mb-4">Nos valeurs</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ce qui nous <span className="text-gradient-gold">anime</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {VALUES.map((value, index) => (
                <div 
                  key={value.title} 
                  className="text-center animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6 hover:scale-110 transition-transform duration-300">
                    <value.icon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="glass-card overflow-hidden animate-fade-up">
                <div className="md:flex items-center">
                  <div className="md:w-1/3 p-8 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <img 
                      src={founderImage} 
                      alt="Jean-Gaspard Segard, fondateur de WineNote" 
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-lg border-4 border-background"
                    />
                  </div>
                  <div className="md:w-2/3 p-8">
                    <Badge className="badge-wine mb-4">Fondateur</Badge>
                    <h3 className="text-2xl font-bold mb-2">Jean-Gaspard Segard</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Passionné de vin et de technologie, j'ai créé WineNote pour partager ma passion 
                      et permettre à chacun de découvrir l'univers fascinant de l'œnologie.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      L'idée est née d'un constat simple : le monde du vin peut sembler intimidant 
                      pour les novices. WineNote a pour ambition de le rendre accessible, 
                      ludique et convivial pour tous.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-b from-background via-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center animate-fade-up">
              <Grape className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Prêt à découvrir le <span className="text-gradient-wine">monde du vin</span> ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Rejoignez une communauté passionnée et commencez votre voyage œnologique dès aujourd'hui.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Button 
                  size="lg" 
                  onClick={handleStartClick}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  {user ? "Accéder à WineNote" : "Commencer gratuitement"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={() => navigate("/learning")}
                >
                  Explorer les cours
                </Button>
              </div>

              {/* Mobile App Download Section — always visible */}
              <div className="pt-8 border-t border-border/50">
                <div className="flex items-center justify-center gap-2 mb-5">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Également disponible sur mobile</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href={APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Télécharger sur l'App Store
                  </a>
                  <a
                    href={ANDROID_BETA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M17.523 2.246a.625.625 0 0 0-.855.216l-1.249 2.12A7.867 7.867 0 0 0 12 3.88a7.867 7.867 0 0 0-3.42.702L7.332 2.462a.625.625 0 1 0-1.07.648l1.2 2.036A7.46 7.46 0 0 0 4 11.878h16a7.46 7.46 0 0 0-3.462-6.732l1.2-2.036a.625.625 0 0 0-.215-.864zM8.5 9.128a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75zm7 0a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75zM4 12.878v7a1 1 0 0 0 1 1h1v2.5a1.25 1.25 0 1 0 2.5 0v-2.5h5v2.5a1.25 1.25 0 1 0 2.5 0v-2.5h1a1 1 0 0 0 1-1v-7H4zm-2.25 0a1.25 1.25 0 0 0-1.25 1.25v4.5a1.25 1.25 0 1 0 2.5 0v-4.5a1.25 1.25 0 0 0-1.25-1.25zm20.5 0a1.25 1.25 0 0 0-1.25 1.25v4.5a1.25 1.25 0 1 0 2.5 0v-4.5a1.25 1.25 0 0 0-1.25-1.25z"/>
                    </svg>
                    Bêta Test Android
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
