import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  Grape
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-wine.jpg";

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
    title: "Jeux Festifs",
    description: "Animez vos soirées avec des jeux de dégustation à l'aveugle, de 1 à 8 joueurs, pour tous les niveaux.",
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
    number: "01",
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Inscrivez-vous gratuitement en quelques secondes et personnalisez votre profil."
  },
  {
    number: "02",
    icon: Search,
    title: "Explorez & Apprenez",
    description: "Parcourez les cours d'œnologie, découvrez des domaines et enrichissez vos connaissances."
  },
  {
    number: "03",
    icon: Share2,
    title: "Partagez vos dégustations",
    description: "Notez vos vins, publiez vos impressions et échangez avec la communauté."
  },
  {
    number: "04",
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

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
          
          <div className="relative z-10 container mx-auto px-4 text-center animate-fade-up">
            <Badge className="badge-wine mb-6 text-sm px-4 py-2">
              <Grape className="w-4 h-4 mr-2" />
              Bienvenue sur WineNote
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              Découvrez <span className="text-gradient-wine">WineNote</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8">
              La plateforme qui réinvente votre passion du vin : apprenez, partagez, dégustez et célébrez ensemble.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/learning")}
                className="border-white/30 text-white hover:bg-white/10"
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

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {STEPS.map((step, index) => (
                <div 
                  key={step.number} 
                  className="relative text-center animate-fade-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Connector line */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                  )}
                  
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <step.icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              ))}
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
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-primary-foreground">JG</span>
                    </div>
                  </div>
                  <div className="md:w-2/3 p-8">
                    <Badge className="badge-wine mb-4">Fondateur</Badge>
                    <h3 className="text-2xl font-bold mb-2">Jean Gaspard Segard</h3>
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
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                >
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/learning")}
                >
                  Explorer les cours
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
