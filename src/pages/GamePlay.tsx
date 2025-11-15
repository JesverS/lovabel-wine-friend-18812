import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";

interface GameQuestion {
  id: number;
  question: string;
  answer_type: 1 | 3 | 4;
  fact_key?: string;
  correct_answers?: string[];
  incorrect_answers?: string[];
  assigned_player?: number;
}

interface Wine {
  id: string;
  name: string;
  year?: number;
  domain: string;
  region: string;
  color: string;
}

interface Player {
  name: string;
  score: number;
}

export default function GamePlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { players: playerNames, wine, questions } = location.state || {} as {
    players: string[];
    wine: Wine;
    questions: GameQuestion[];
  };

  const [players, setPlayers] = useState<Player[]>(
    playerNames?.map((name: string) => ({ name, score: 0 })) || []
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [gameStatus, setGameStatus] = useState<"playing" | "finished">("playing");
  const [showResult, setShowResult] = useState(false);

  // Rediriger si pas de données
  if (!playerNames || !wine || !questions || questions.length === 0) {
    navigate("/game");
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Mélanger les réponses pour les questions de type 3
  const shuffledAnswers = useMemo(() => {
    if (currentQuestion.answer_type !== 3) return [];
    const all = [
      ...(currentQuestion.correct_answers || []),
      ...(currentQuestion.incorrect_answers || [])
    ];
    return all.sort(() => Math.random() - 0.5);
  }, [currentQuestionIndex]);

  const handleAnswerClick = (answer: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    // Vérifier si la réponse est correcte (pour type 3)
    if (currentQuestion.answer_type === 3) {
      const isCorrect = currentQuestion.correct_answers?.includes(answer);
      if (isCorrect && currentQuestion.assigned_player !== undefined) {
        const newPlayers = [...players];
        newPlayers[currentQuestion.assigned_player].score += 1;
        setPlayers(newPlayers);
      }
    }
  };

  const handleVote = (correct: boolean) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(correct ? 1 : 0);
    setShowResult(true);
    
    // Attribuer le point si "bien répondu"
    if (correct && currentQuestion.assigned_player !== undefined) {
      const newPlayers = [...players];
      newPlayers[currentQuestion.assigned_player].score += 1;
      setPlayers(newPlayers);
    }
  };

  const handlePlayerVote = (playerIndex: number) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(playerIndex);
    setShowResult(true);
    
    // Attribuer le point au joueur sélectionné
    const newPlayers = [...players];
    newPlayers[playerIndex].score += 1;
    setPlayers(newPlayers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setGameStatus("finished");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const getAnswerClass = (answer: string) => {
    if (!showResult) return "";
    
    if (currentQuestion.answer_type === 3) {
      const isCorrect = currentQuestion.correct_answers?.includes(answer);
      const isSelected = selectedAnswer === answer;
      
      if (isSelected && isCorrect) return "bg-green-500 hover:bg-green-600 text-white";
      if (isSelected && !isCorrect) return "bg-red-500 hover:bg-red-600 text-white";
      if (!isSelected && isCorrect) return "bg-green-500 hover:bg-green-600 text-white";
      return "opacity-50";
    }
    
    return "";
  };

  if (gameStatus === "playing") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-wine-light to-wine-DEFAULT p-4">
        <div className="container mx-auto py-8">
          {/* En-tête avec scores */}
          <Card className="mb-6 p-4">
            <div className="flex justify-between items-center mb-4">
              <Badge variant="outline" className="text-lg">
                Question {currentQuestionIndex + 1}/{questions.length}
              </Badge>
              <div className="text-sm text-muted-foreground">
                {wine.name} {wine.year ? `${wine.year}` : ''} - {wine.domain}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players.map((player, idx) => (
                <div key={idx} className="text-center">
                  <div className="font-semibold">{player.name}</div>
                  <div className="text-2xl font-bold text-wine-dark">{player.score}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Question - Type 1: Vote du peuple */}
          {currentQuestion.answer_type === 1 && (
            <Card className="p-6 mb-6">
              <div className="space-y-6">
                <div className="text-center">
                  <Badge className="mb-4 text-lg">
                    Question pour {players[currentQuestion.assigned_player!].name}
                  </Badge>
                  <h2 className="text-2xl font-bold mb-6">{currentQuestion.question}</h2>
                </div>
                
                {!showResult && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-muted-foreground text-lg">🗳️ À vous de voter</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                      <Button 
                        onClick={() => handleVote(true)} 
                        className="h-20 text-lg"
                        size="lg"
                      >
                        ✅ Bien répondu
                      </Button>
                      <Button 
                        onClick={() => handleVote(false)} 
                        className="h-20 text-lg"
                        size="lg"
                        variant="destructive"
                      >
                        ❌ Mal répondu
                      </Button>
                    </div>
                  </>
                )}
                
                {showResult && (
                  <div className="text-center">
                    <p className="text-lg mb-4">
                      {selectedAnswer === 1 
                        ? `✅ ${players[currentQuestion.assigned_player!].name} gagne 1 point !` 
                        : `❌ ${players[currentQuestion.assigned_player!].name} ne gagne pas de point.`}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Question - Type 3: Réponses multiples */}
          {currentQuestion.answer_type === 3 && (
            <Card className="p-6 mb-6">
              <div className="space-y-6">
                <div className="text-center">
                  <Badge className="mb-4 text-lg">
                    Question pour {players[currentQuestion.assigned_player!].name}
                  </Badge>
                  <h2 className="text-2xl font-bold mb-6">{currentQuestion.question}</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {shuffledAnswers.map((answer, index) => (
                    <Button
                      key={index}
                      onClick={() => handleAnswerClick(answer)}
                      disabled={selectedAnswer !== null}
                      className={`h-20 text-lg ${getAnswerClass(answer)}`}
                      variant="outline"
                    >
                      {answer}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Question - Type 4: Question collective */}
          {currentQuestion.answer_type === 4 && (
            <Card className="p-6 mb-6">
              <div className="space-y-6">
                <div className="text-center">
                  <Badge className="mb-4 text-lg">Question pour tout le monde</Badge>
                  <h2 className="text-2xl font-bold mb-4">
                    Chacun son tour, faites l'action suivante :
                  </h2>
                  <p className="text-xl mb-6">{currentQuestion.question}</p>
                </div>
                
                {!showResult && (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-muted-foreground text-lg">🗳️ Qui a le mieux répondu ?</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                      {players.map((player, index) => (
                        <Button
                          key={index}
                          onClick={() => handlePlayerVote(index)}
                          className="h-20 text-lg"
                          variant="outline"
                        >
                          {player.name}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
                
                {showResult && typeof selectedAnswer === 'number' && (
                  <div className="text-center">
                    <p className="text-lg">
                      🏆 {players[selectedAnswer].name} gagne 1 point !
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Bouton suivant */}
          {showResult && (
            <div className="text-center">
              <Button size="lg" onClick={handleNextQuestion}>
                {currentQuestionIndex < questions.length - 1
                  ? "Question suivante"
                  : "Voir les résultats"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Écran de résultats
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-wine-light to-wine-DEFAULT p-4">
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center space-y-6">
            <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
            <h1 className="text-4xl font-bold">Fin de la partie !</h1>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">🏆 Vainqueur</h2>
                <p className="text-3xl font-bold text-wine-dark">{winner.name}</p>
                <p className="text-xl text-muted-foreground">{winner.score} points</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Classement final</h3>
                {sortedPlayers.map((player, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-secondary/20 rounded"
                  >
                    <span className="font-medium">
                      {index + 1}. {player.name}
                    </span>
                    <span className="font-bold">{player.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button onClick={() => navigate("/game")} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Nouvelle partie
              </Button>
              <Button onClick={() => navigate("/")}>
                <Home className="mr-2 h-4 w-4" />
                Accueil
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
