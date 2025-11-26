import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message envoyé !",
      description: "Nous vous répondrons dans les plus brefs délais.",
    });
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow">
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient-wine">Contactez-nous</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Une question ? Une suggestion ? N'hésitez pas à nous écrire
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Contact Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Formulaire de contact
              </CardTitle>
              <CardDescription>Remplissez le formulaire ci-dessous</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Votre nom"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="votre@email.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Sujet</Label>
                  <Select
                    value={formData.subject}
                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un sujet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Question générale</SelectItem>
                      <SelectItem value="support">Support technique</SelectItem>
                      <SelectItem value="partnership">Partenariat</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Votre message..."
                    rows={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  Envoyer le message
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info & FAQ */}
          <div className="space-y-8">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-6 w-6 text-primary" />
                  Informations de contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-muted-foreground">contact@winenote.fr</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Adresse</p>
                    <p className="text-muted-foreground">
                      Paris, France
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Questions fréquentes</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Comment créer une cave ?</AccordionTrigger>
                    <AccordionContent>
                      Connectez-vous à votre compte, puis rendez-vous dans la section "Caves" 
                      et cliquez sur "Créer une cave". Vous pourrez ensuite personnaliser votre cave 
                      et commencer à y ajouter vos vins.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Est-ce gratuit ?</AccordionTrigger>
                    <AccordionContent>
                      Oui, Wine Note est gratuit pour les fonctionnalités de base. 
                      Vous pouvez créer votre cave, ajouter des vins et participer à la communauté 
                      sans frais.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>Comment participer aux événements ?</AccordionTrigger>
                    <AccordionContent>
                      Consultez la section "Événements" pour découvrir les dégustations et 
                      salons à venir. Vous pouvez vous inscrire directement en ligne.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
