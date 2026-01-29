import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Database, 
  Lock, 
  FileText, 
  Mail, 
  Cookie, 
  User, 
  Server, 
  Target, 
  ShieldCheck, 
  Scale, 
  Users, 
  Globe, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Building 
} from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Politique de Confidentialité | Wine Note</title>
        <meta name="description" content="Politique de confidentialité de Wine Note. Découvrez comment nous protégeons vos données personnelles et respectons votre vie privée." />
        <link rel="canonical" href="https://winenote.me/privacy" />
        <meta property="og:title" content="Politique de Confidentialité - Wine Note" />
        <meta property="og:url" content="https://winenote.me/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow max-w-4xl">
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Politique de <span className="text-gradient-wine">Confidentialité</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-2">WineNote</p>
          <p className="text-muted-foreground">
            Dernière mise à jour : 31 décembre 2024
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1 - Responsable du traitement */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                1. Responsable du traitement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Les données personnelles collectées dans le cadre de l'utilisation du site{" "}
                <a href="https://winenote.me" className="text-primary hover:underline">
                  https://winenote.me
                </a>{" "}
                et de l'application <strong>WineNote</strong> sont traitées sous la responsabilité de :
              </p>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="font-semibold">Jean Gaspard Segard</p>
                <p className="text-muted-foreground">agissant en tant que personne physique,</p>
                <p className="text-muted-foreground">éditeur de la plateforme WineNote.</p>
              </div>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Contact :{" "}
                <a href="mailto:contact@winenote.me" className="text-primary hover:underline font-semibold">
                  contact@winenote.me
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Section 2 - Données personnelles collectées */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                2. Données personnelles collectées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                WineNote collecte et stocke uniquement les données nécessaires au fonctionnement du service.
              </p>
              
              <div>
                <h4 className="font-semibold mb-2">2.1 Données obligatoires lors de l'inscription :</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>adresse email</li>
                  <li>pseudonyme</li>
                  <li>nom</li>
                  <li>prénom</li>
                  <li>ville de résidence (ville uniquement)</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">2.2 Données facultatives fournies volontairement :</h4>
                <p className="text-muted-foreground mb-2">
                  L'utilisateur peut, s'il le souhaite, compléter son profil avec :
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>une photo de profil</li>
                  <li>une adresse postale</li>
                  <li>un numéro de téléphone</li>
                  <li>une description personnelle</li>
                  <li>des liens vers des réseaux sociaux</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-3 bg-muted/30 p-3 rounded-lg">
                  Ces données sont <strong>facultatives</strong>, fournies <strong>volontairement</strong> et leur 
                  visibilité (publique ou privée) est <strong>entièrement paramétrable par l'utilisateur</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 - Données liées à l'utilisation */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                3. Données liées à l'utilisation du service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                WineNote stocke les contenus générés par les utilisateurs, notamment :
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>publications, commentaires et interactions sociales</li>
                <li>dégustations (notes, commentaires, photos, localisations)</li>
                <li>événements créés (titres, dates, lieux, descriptions)</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Ces données transitent exclusivement par les serveurs de WineNote.
              </p>
            </CardContent>
          </Card>

          {/* Section 4 - Données techniques */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-6 w-6 text-primary" />
                4. Données techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                WineNote collecte uniquement des données techniques <strong>strictement nécessaires</strong> au 
                fonctionnement du service, notamment :
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>logs de connexion</li>
                <li>horodatages</li>
                <li>identifiants de session (tokens)</li>
              </ul>

              <Separator />

              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <p className="font-semibold text-green-700 dark:text-green-400 mb-2">
                  WineNote ne procède à aucune collecte volontaire :
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>d'adresse IP</li>
                  <li>de type d'appareil</li>
                  <li>de navigateur</li>
                  <li>ou de système d'exploitation</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Section 5 - Cookies et stockage local */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-6 w-6 text-primary" />
                5. Cookies et stockage local
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">5.1 Cookies</h4>
                <p className="text-muted-foreground">
                  Le site web WineNote peut utiliser des <strong>cookies strictement nécessaires</strong> au 
                  maintien des sessions et à la sécurité du service.
                </p>
                <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-3 rounded-lg">
                  Aucun cookie publicitaire, de suivi ou de traçage comportemental n'est utilisé.
                </p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">5.2 Stockage local</h4>
                <p className="text-muted-foreground">
                  L'application mobile peut utiliser un <strong>stockage local</strong> sur l'appareil de 
                  l'utilisateur afin d'assurer certaines fonctionnalités techniques (connexion, sessions, 
                  données temporaires).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Section 6 - Finalités des traitements */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                6. Finalités des traitements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Les données personnelles sont traitées exclusivement pour les finalités suivantes :
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>création et gestion des comptes utilisateurs</li>
                <li>fonctionnement des fonctionnalités sociales</li>
                <li>gestion des dégustations et des événements</li>
                <li>amélioration continue de l'application</li>
                <li>production de statistiques d'usage <strong>strictement anonymisées et agrégées</strong></li>
                <li>sécurité, prévention des abus et lutte contre les comportements malveillants</li>
                <li>communication fonctionnelle avec les utilisateurs</li>
                <li>promotion de WineNote à partir de contenus <strong>anonymisés</strong></li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 7 - Absence de revente des données */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                7. Absence de revente des données
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <p className="font-semibold text-green-700 dark:text-green-400">
                  WineNote ne vend, ne loue, ne cède ni ne commercialise aucune donnée personnelle, 
                  sous quelque forme que ce soit.
                </p>
              </div>
              <p className="text-muted-foreground mt-4">
                Aucune donnée personnelle identifiable n'est transmise à des tiers à des fins commerciales.
              </p>
            </CardContent>
          </Card>

          {/* Section 8 - Base légale des traitements */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                8. Base légale des traitements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Les traitements reposent sur :</p>
              <ul className="space-y-3">
                <li>
                  <strong>L'exécution des Conditions Générales d'Utilisation</strong>
                </li>
                <li>
                  <strong>Le consentement de l'utilisateur</strong> lorsque requis
                </li>
                <li>
                  <strong>L'intérêt légitime de WineNote</strong> à assurer la sécurité, la stabilité 
                  et l'amélioration du service
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 9 - Destinataires des données */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                9. Destinataires des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Les données sont accessibles uniquement par WineNote.
              </p>
              <p>
                WineNote fait appel à des prestataires techniques, notamment :
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>AWS</strong> et <strong>Supabase</strong> pour l'hébergement</li>
                <li><strong>Stripe</strong> pour la gestion des paiements</li>
              </ul>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Stripe agit en tant que <strong>responsable de traitement indépendant</strong> pour ses propres services.
              </p>
            </CardContent>
          </Card>

          {/* Section 10 - Hébergement des données */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-primary" />
                10. Hébergement des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Les données sont hébergées <strong>au sein de l'Union européenne</strong>.
              </p>
              <p className="text-muted-foreground">
                Aucun transfert hors de l'Union européenne n'est effectué à ce jour.
              </p>
              <p className="text-sm text-muted-foreground">
                L'infrastructure technique est susceptible d'évoluer, dans le respect de la 
                réglementation applicable.
              </p>
            </CardContent>
          </Card>

          {/* Section 11 - Durée de conservation */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                11. Durée de conservation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  <strong>Compte actif :</strong>{" "}
                  <span className="text-muted-foreground">
                    Les données personnelles sont conservées tant que le compte utilisateur est actif.
                  </span>
                </li>
                <li>
                  <strong>Suppression du compte :</strong>{" "}
                  <span className="text-muted-foreground">
                    Les données sont supprimées dans un délai maximum de 30 jours.
                  </span>
                </li>
                <li>
                  <strong>Bannissement :</strong>{" "}
                  <span className="text-muted-foreground">
                    Certains logs peuvent être conservés à des fins de sécurité.
                  </span>
                </li>
                <li>
                  <strong>Données statistiques :</strong>{" "}
                  <span className="text-muted-foreground">
                    Les données anonymisées peuvent être conservées sans limitation de durée.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Section 12 - Droits des utilisateurs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                12. Droits des utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Conformément à la réglementation en vigueur, l'utilisateur dispose des droits suivants :</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit d'accès :</span>
                  <span className="text-muted-foreground">obtenir une copie de vos données personnelles</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit de rectification :</span>
                  <span className="text-muted-foreground">corriger vos données inexactes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit à l'effacement :</span>
                  <span className="text-muted-foreground">supprimer vos données</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit à la limitation :</span>
                  <span className="text-muted-foreground">limiter le traitement de vos données</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit d'opposition :</span>
                  <span className="text-muted-foreground">vous opposer au traitement de vos données</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">Droit à la portabilité :</span>
                  <span className="text-muted-foreground">lorsque applicable</span>
                </li>
              </ul>
              <Separator />
              <p className="flex items-center gap-2">
                Toute demande s'effectue par email à :{" "}
                <a href="mailto:contact@winenote.me" className="text-primary hover:underline font-semibold">
                  contact@winenote.me
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Section 13 - Sécurité des données */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                13. Sécurité des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                WineNote met en œuvre des mesures techniques et organisationnelles raisonnables 
                afin de protéger les données personnelles.
              </p>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Toutefois, aucune sécurité absolue ne peut être garantie.
              </p>
            </CardContent>
          </Card>

          {/* Section 14 - Mineurs */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-primary" />
                14. Mineurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-semibold">
                WineNote est strictement réservé aux personnes majeures.
              </p>
              <p className="text-muted-foreground">
                Aucune donnée de mineur n'est volontairement collectée.
              </p>
              <p className="text-muted-foreground">
                Tout compte identifié comme appartenant à un mineur sera supprimé immédiatement.
              </p>
            </CardContent>
          </Card>

          {/* Section 15 - Modification de la politique */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                15. Modification de la politique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                La présente politique de confidentialité peut être modifiée à tout moment.
              </p>
              <p className="text-muted-foreground mt-2">
                L'utilisation continue du service vaut acceptation des modifications.
              </p>
            </CardContent>
          </Card>

          {/* Section 16 - Autorité de contrôle */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-6 w-6 text-primary" />
                16. Autorité de contrôle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                L'utilisateur peut introduire une réclamation auprès de l'autorité compétente, 
                notamment la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés).
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
