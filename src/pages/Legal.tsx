import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Scale, Building, Server, Copyright, AlertCircle } from "lucide-react";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow max-w-4xl">
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient-wine">Mentions Légales</span>
          </h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                Éditeur du site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Nom du site :</strong> Wine Note</p>
              <p><strong>URL :</strong> https://winenote.me</p>
              <p><strong>Propriétaire :</strong> Wine Note</p>
              <p><strong>Responsable de publication :</strong> Wine Note</p>
              <p><strong>Siège social :</strong> Paris, France</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-6 w-6 text-primary" />
                Hébergement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Hébergeur :</strong> Lovable</p>
              <p><strong>Base de données :</strong> Supabase</p>
              <p>Les données sont hébergées dans des centres de données sécurisés conformes aux normes européennes.</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copyright className="h-6 w-6 text-primary" />
                Propriété intellectuelle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                L'ensemble des contenus présents sur le site Wine Note (textes, images, vidéos, logos, icônes) 
                est protégé par le droit d'auteur et le droit des marques.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
                des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, 
                sauf autorisation écrite préalable de Wine Note.
              </p>
              <Separator />
              <div>
                <p className="font-semibold mb-2">Crédits :</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Images : illustrations générées ou sous licence libre</li>
                  <li>Icônes : Lucide Icons</li>
                  <li>Polices : Google Fonts</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-primary" />
                Limitation de responsabilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Wine Note met tout en œuvre pour offrir aux utilisateurs des informations 
                et/ou outils disponibles et vérifiés, mais ne saurait être tenu pour responsable 
                des erreurs, d'une absence de disponibilité des informations et/ou des services.
              </p>
              <p>
                Wine Note ne pourra être tenu responsable de dommages matériels liés à l'utilisation 
                du site. De plus, l'utilisateur du site s'engage à accéder au site en utilisant 
                un matériel récent, ne contenant pas de virus et avec un navigateur de dernière génération.
              </p>
              <p>
                Les informations concernant les vins, domaines et événements sont fournies à titre indicatif 
                et peuvent être modifiées sans préavis.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                Loi applicable et juridiction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Les présentes mentions légales sont régies par le droit français.
              </p>
              <p>
                En cas de litige et à défaut d'accord amiable, le litige sera porté devant 
                les tribunaux français conformément aux règles de compétence en vigueur.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Avertissement :</strong> L'abus d'alcool est dangereux pour la santé. 
                À consommer avec modération.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
