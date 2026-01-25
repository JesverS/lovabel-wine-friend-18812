import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { getEventDeepLink, getStoreUrl, isMobileDevice } from "@/lib/mobileAppUtils";

export default function PaymentCancelled() {
  const { slug } = useParams<{ slug: string }>();

  const handleRetry = () => {
    window.location.href = `/pay/${slug}`;
  };

  const handleBackToApp = () => {
    const deepLink = getEventDeepLink(slug || "", null);
    window.location.href = deepLink;
    
    // Fallback to store after delay if app doesn't open
    if (isMobileDevice()) {
      const storeUrl = getStoreUrl();
      if (storeUrl) {
        setTimeout(() => {
          if (document.visibilityState !== "hidden") {
            window.location.href = storeUrl;
          }
        }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Helmet>
        <title>Paiement annulé | Wine Note</title>
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle>Paiement annulé</CardTitle>
          <CardDescription>
            Votre paiement a été annulé. Aucun montant n'a été prélevé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleRetry}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer le paiement
          </Button>
          
          <Button 
            onClick={handleBackToApp}
            className="w-full"
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'app
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
