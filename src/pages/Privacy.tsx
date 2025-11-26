import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Database, Lock, Eye, FileText, Mail, Cookie } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow max-w-4xl">
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Politique de <span className="text-gradient-wine">Confidentialité</span>
          </h1>
          <p className="text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Wine Note s'engage à protéger la vie privée de ses utilisateurs. 
                Cette politique de confidentialité explique comment nous collectons, utilisons, 
                partageons et protégeons vos informations personnelles conformément au 
                Règlement Général sur la Protection des Données (RGPD).
              </p>
              <p className="text-sm text-muted-foreground">
                En utilisant notre plateforme, vous acceptez les pratiques décrites dans cette politique.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Données collectées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Informations d'inscription :</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Mot de passe (crypté)</li>
                  <li>Photo de profil (optionnel)</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Données d'utilisation :</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Caves et vins ajoutés</li>
                  <li>Notes et commentaires sur les vins</li>
                  <li>Participation aux événements</li>
                  <li>Progression dans les cours</li>
                  <li>Interactions sociales (likes, commentaires)</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Données techniques :</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Adresse IP</li>
                  <li>Type de navigateur</li>
                  <li>Pages visitées et durée de visite</li>
                  <li>Données de géolocalisation (si autorisée)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Finalités du traitement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Nous utilisons vos données pour :</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Créer et gérer votre compte utilisateur</li>
                <li>Vous permettre de gérer vos caves et vins</li>
                <li>Faciliter votre participation aux événements</li>
                <li>Personnaliser votre expérience d'apprentissage</li>
                <li>Vous envoyer des notifications importantes</li>
                <li>Améliorer nos services et développer de nouvelles fonctionnalités</li>
                <li>Assurer la sécurité de la plateforme</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                Base légale du traitement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li>
                  <strong>Exécution du contrat :</strong> traitement nécessaire à la fourniture 
                  de nos services (gestion de compte, caves, événements)
                </li>
                <li>
                  <strong>Consentement :</strong> pour l'envoi de communications marketing 
                  (vous pouvez retirer votre consentement à tout moment)
                </li>
                <li>
                  <strong>Intérêt légitime :</strong> amélioration de nos services, 
                  sécurité de la plateforme
                </li>
                <li>
                  <strong>Obligation légale :</strong> conservation de certaines données 
                  pour respecter nos obligations légales
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                Partage des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Vos données personnelles ne sont jamais vendues à des tiers.</p>
              <p>Nous pouvons partager vos données avec :</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>Prestataires techniques :</strong> hébergement (Supabase), 
                  authentification, envoi d'emails
                </li>
                <li>
                  <strong>Autres utilisateurs :</strong> certaines informations de profil 
                  sont publiques (nom, photo, caves publiques) selon vos paramètres de confidentialité
                </li>
                <li>
                  <strong>Organisateurs d'événements :</strong> lorsque vous vous inscrivez 
                  à un événement
                </li>
                <li>
                  <strong>Autorités légales :</strong> si requis par la loi
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Durée de conservation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <strong>Compte actif :</strong> tant que votre compte est actif
                </li>
                <li>
                  <strong>Compte supprimé :</strong> 30 jours après suppression 
                  (période de rétractation)
                </li>
                <li>
                  <strong>Données légales :</strong> durée requise par la loi (généralement 3 ans)
                </li>
                <li>
                  <strong>Données anonymisées :</strong> peuvent être conservées indéfiniment 
                  à des fins statistiques
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Vos droits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="space-y-3">
                <li>
                  <strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles
                </li>
                <li>
                  <strong>Droit de rectification :</strong> corriger vos données inexactes
                </li>
                <li>
                  <strong>Droit à l'effacement :</strong> supprimer vos données ("droit à l'oubli")
                </li>
                <li>
                  <strong>Droit à la limitation :</strong> limiter le traitement de vos données
                </li>
                <li>
                  <strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré
                </li>
                <li>
                  <strong>Droit d'opposition :</strong> vous opposer au traitement de vos données
                </li>
                <li>
                  <strong>Droit de retirer votre consentement :</strong> à tout moment
                </li>
              </ul>
              <Separator />
              <p className="text-sm">
                Pour exercer ces droits, contactez-nous à : 
                <strong className="text-primary ml-1">privacy@winenote.fr</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="h-6 w-6 text-primary" />
                Cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Wine Note utilise des cookies pour améliorer votre expérience utilisateur :
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>
                  <strong>Cookies essentiels :</strong> nécessaires au fonctionnement du site 
                  (authentification, préférences)
                </li>
                <li>
                  <strong>Cookies analytiques :</strong> pour comprendre comment vous utilisez 
                  le site (anonymisés)
                </li>
              </ul>
              <p className="text-sm">
                Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-primary" />
                Sécurité des données
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées 
                pour protéger vos données personnelles :
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Cryptage des données sensibles (mots de passe, communications)</li>
                <li>Serveurs sécurisés avec certificats SSL/TLS</li>
                <li>Accès restreint aux données personnelles</li>
                <li>Sauvegardes régulières</li>
                <li>Audits de sécurité réguliers</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Pour toute question concernant cette politique de confidentialité ou 
                l'utilisation de vos données personnelles :
              </p>
              <p><strong>Email :</strong> privacy@winenote.fr</p>
              <p><strong>Adresse :</strong> Wine Note, Paris, France</p>
              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                Vous avez également le droit de déposer une plainte auprès de la CNIL 
                (Commission Nationale de l'Informatique et des Libertés) si vous estimez 
                que vos droits ne sont pas respectés.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
