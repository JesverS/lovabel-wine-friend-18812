import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Wine, Search, Plus, X, Play, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function GameMultiplayer() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedWine, setSelectedWine] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search wines with debounce
  useEffect(() => {
    const searchWines = async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);

      try {
        const { data, error } = await (supabase as any).rpc('search_wines', {
          query: searchQuery.trim()
        });

        if (error) throw error;

        // Filter only playable wines
        const playableWines = (data || []).filter((wine: any) => wine.is_playable === true);
        setSearchResults(playableWines);
      } catch (error: any) {
        console.error('Error searching wines:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de rechercher les vins',
        });
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchWines();
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addPlayer = () => {
    if (newPlayerName.trim() && players.length < 8) {
      setPlayers([...players, newPlayerName.trim()]);
      setNewPlayerName("");
    }
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSelectWine = (wine: any) => {
    setSelectedWine(wine);
    setSearchQuery("");
    setSearchResults([]);
  };

  const canStartGame = players.length >= 1 && selectedWine;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 mb-4">
            <Wine className="h-4 w-4 text-secondary" />
            <span className="text-sm text-secondary font-medium">Jeu d'ambiance convivial</span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
            Soirée <span className="text-gradient-gold">Vin</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un jeu d'ambiance de 1 à 8 joueurs pour animer vos dégustations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Players Setup */}
          <Card className="animate-fade-up border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Joueurs ({players.length}/8)
              </CardTitle>
              <CardDescription>
                Ajoutez entre 1 et 8 joueurs pour commencer la partie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Player Input */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Nom du joueur"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                    disabled={players.length >= 8}
                  />
                </div>
                <Button
                  onClick={addPlayer}
                  disabled={!newPlayerName.trim() || players.length >= 8}
                  className="bg-gradient-wine hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Players List */}
              <div className="space-y-2 min-h-[200px]">
                {players.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p className="text-sm">Aucun joueur ajouté</p>
                  </div>
                ) : (
                  players.map((player, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{player}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePlayer(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Wine Selection */}
          <Card className="animate-fade-up border-2" style={{ animationDelay: "100ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wine className="h-5 w-5 text-secondary" />
                Bouteille dégustée
              </CardTitle>
              <CardDescription>
                Recherchez et sélectionnez le vin que vous dégustez
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un vin jouable..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Selected Wine or Search Results */}
              {selectedWine ? (
                <div className="min-h-[200px] rounded-lg border-2 flex items-center justify-center p-4">
                  <div className="text-center">
                    {selectedWine.label_url && (
                      <img 
                        src={selectedWine.label_url} 
                        alt={selectedWine.name}
                        className="h-24 w-auto mx-auto mb-3 rounded object-cover"
                      />
                    )}
                    <h3 className="font-semibold text-lg mb-1">{selectedWine.name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{selectedWine.domain?.name}</p>
                    {selectedWine.year && (
                      <p className="text-xs text-muted-foreground mb-3">Année: {selectedWine.year}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWine(null)}
                    >
                      Changer de vin
                    </Button>
                  </div>
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {searchLoading ? 'Recherche en cours...' : `${searchResults.length} vin${searchResults.length > 1 ? 's' : ''} trouvé${searchResults.length > 1 ? 's' : ''}`}
                  </Label>
                  {searchResults.length > 0 ? (
                    <div className="max-h-[280px] overflow-y-auto space-y-2 border rounded-lg p-2">
                      {searchResults.map((wine) => (
                        <div
                          key={wine.id}
                          onClick={() => handleSelectWine(wine)}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                        >
                          {wine.label_url && (
                            <img 
                              src={wine.label_url} 
                              alt={wine.name}
                              className="h-12 w-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{wine.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{wine.domain?.name}</p>
                            {wine.year && (
                              <p className="text-xs text-muted-foreground">Année: {wine.year}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !searchLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
                      <Wine className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aucun vin jouable trouvé</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="min-h-[200px] rounded-lg border-2 border-dashed flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Wine className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Recherchez un vin ci-dessus</p>
                    <p className="text-xs mt-1">Seuls les vins jouables sont disponibles</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Info Card */}
        <Card className="mt-8 max-w-6xl mx-auto glass-card animate-fade-up" style={{ animationDelay: "200ms" }}>
          <CardHeader>
            <CardTitle>Comment jouer ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-wine flex items-center justify-center text-primary-foreground font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Ajoutez les joueurs</h4>
                  <p className="text-sm text-muted-foreground">
                    De 1 à 8 personnes sur un seul téléphone
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-slate font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Choisissez votre vin</h4>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez la bouteille que vous dégustez
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-wine flex items-center justify-center text-primary-foreground font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Répondez aux questions</h4>
                  <p className="text-sm text-muted-foreground">
                    Culture générale et ressentis personnels
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Game Button */}
        <div className="mt-8 text-center animate-fade-up" style={{ animationDelay: "300ms" }}>
          <Button
            size="lg"
            disabled={!canStartGame}
            className="bg-gradient-wine hover:opacity-90 px-12 text-lg h-14 disabled:opacity-50"
          >
            <Play className="h-5 w-5 mr-2" />
            Commencer la partie
          </Button>
          {!canStartGame && (
            <p className="text-sm text-muted-foreground mt-3">
              Ajoutez au moins 1 joueur et sélectionnez un vin pour commencer
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
