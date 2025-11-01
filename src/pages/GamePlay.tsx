import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wine, Trophy, Home, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";

// 16 questions génériques sur le vin
const WINE_QUESTIONS = [
  {
    id: 1,
    question: "De quelle couleur est le vin dans cette bouteille ?",
    answers: ["Rouge", "Blanc", "Rosé", "Orange"],
    correctAnswer: 0,
  },
  {
    id: 2,
    question: "Quel arôme ressens-tu le plus en le sentant ?",
    answers: ["Fruité", "Boisé", "Floral", "Épicé"],
    correctAnswer: 0,
  },
  {
    id: 3,
    question: "Ce vin est plutôt…",
    answers: ["Doux", "Sec", "Sucré", "Moelleux"],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "Quelle est la température idéale pour servir ce vin ?",
    answers: ["6–8°C", "10–12°C", "16–18°C", "20°C"],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: "Quelle région produit le plus de vin en France ?",
    answers: ["Bordeaux", "Champagne", "Alsace", "Loire"],
    correctAnswer: 0,
  },
  {
    id: 6,
    question: "Quel type de verre est le plus adapté à ce vin ?",
    answers: ["Verre à flûte", "Verre à pied large", "Coupe plate", "Tasse"],
    correctAnswer: 1,
  },
  {
    id: 7,
    question: "Le vin rouge tire sa couleur principalement de…",
    answers: [
      "La peau du raisin",
      "La pulpe du raisin",
      "La fermentation",
      "L'ajout de colorant naturel",
    ],
    correctAnswer: 0,
  },
  {
    id: 8,
    question: "Quel aliment s'accorde le mieux avec ce vin ?",
    answers: ["Poisson", "Fromage", "Dessert", "Salade"],
    correctAnswer: 1,
  },
  {
    id: 9,
    question: "Quel est le pourcentage d'alcool moyen d'un vin classique ?",
    answers: ["5 %", "8 %", "12 %", "20 %"],
    correctAnswer: 2,
  },
  {
    id: 10,
    question: "Que signifie \"millésime\" sur une étiquette de vin ?",
    answers: [
      "L'année d'embouteillage",
      "L'année de naissance du vigneron",
      "L'année de récolte des raisins",
      "L'année d'achat",
    ],
    correctAnswer: 2,
  },
  {
    id: 11,
    question: "Combien de bouteilles fait un magnum de vin ?",
    answers: ["1", "1,5", "2", "3"],
    correctAnswer: 2,
  },
  {
    id: 12,
    question: "Quel vin sert-on souvent à l'apéritif ?",
    answers: ["Rouge corsé", "Blanc sec", "Vin doux", "Rosé sucré"],
    correctAnswer: 1,
  },
  {
    id: 13,
    question: "Que signifie \"terroir\" ?",
    answers: [
      "Le goût du vin",
      "Le sol, le climat et le savoir-faire",
      "La variété de raisin",
      "La méthode de fermentation",
    ],
    correctAnswer: 1,
  },
  {
    id: 14,
    question: "Quelle est la contenance standard d'une bouteille de vin ?",
    answers: ["50 cl", "75 cl", "1 L", "1,5 L"],
    correctAnswer: 1,
  },
  {
    id: 15,
    question: "Le mot \"tannique\" décrit…",
    answers: ["Le taux de sucre", "L'acidité", "L'amertume", "Le parfum"],
    correctAnswer: 2,
  },
  {
    id: 16,
    question: "Lequel de ces vins est naturellement effervescent ?",
    answers: ["Bordeaux", "Champagne", "Bourgogne", "Beaujolais"],
    correctAnswer: 1,
  },
];

interface Player {
  name: string;
  score: number;
}

export default function GamePlay() {
  const location = useLocation();
  const navigate = useNavigate();
  const { players: playerNames = [], wine } = location.state || {};

  const [players, setPlayers] = useState<Player[]>(
    playerNames.map((name: string) => ({ name, score: 0 }))
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Redirect if no players
  useEffect(() => {
    if (!playerNames || playerNames.length === 0) {
      navigate("/game");
    }
  }, [playerNames, navigate]);

  const currentQuestion = WINE_QUESTIONS[currentQuestionIndex];

  const handleAnswerClick = (answerIndex: number) => {
    if (selectedAnswer !== null) return; // Already answered

    setSelectedAnswer(answerIndex);
    setShowResult(true);

    // Update scores if correct answer
    if (answerIndex === currentQuestion.correctAnswer) {
      setPlayers((prev) =>
        prev.map((player, idx) =>
          idx === currentQuestionIndex % players.length
            ? { ...player, score: player.score + 1 }
            : player
        )
      );
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < WINE_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Game finished
      setGameFinished(true);
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const getAnswerClass = (answerIndex: number) => {
    if (!showResult) {
      return selectedAnswer === answerIndex
        ? "border-primary bg-primary/10"
        : "hover:border-primary/50 hover:bg-primary/5";
    }

    if (answerIndex === currentQuestion.correctAnswer) {
      return "border-green-500 bg-green-500/20 text-green-700";
    }

    if (selectedAnswer === answerIndex && answerIndex !== currentQuestion.correctAnswer) {
      return "border-red-500 bg-red-500/20 text-red-700";
    }

    return "opacity-50";
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (gameFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-secondary/5 to-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 shadow-xl animate-fade-up">
          <CardContent className="pt-8 pb-6">
            {/* Winner Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4 animate-bounce">
                <Trophy className="h-10 w-10 text-white" />
              </div>
              <h2 className="font-serif text-4xl font-bold mb-2">
                Bravo {sortedPlayers[0]?.name} !
              </h2>
              <p className="text-lg text-muted-foreground">
                🎉 Vous avez gagné avec {sortedPlayers[0]?.score} points !
              </p>
            </div>

            {/* Leaderboard */}
            <div className="space-y-3 mb-8">
              <h3 className="font-semibold text-lg text-center mb-4">
                🏆 Classement Final
              </h3>
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.name}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400 shadow-md"
                      : index === 1
                      ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300"
                      : "bg-muted/50 border-muted"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-yellow-500 text-white text-lg"
                          : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                          ? "bg-orange-400 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="font-semibold text-lg">{player.name}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-lg px-4 py-2 font-bold"
                  >
                    {player.score} pts
                  </Badge>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/game")}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Rejouer
              </Button>
              <Button
                onClick={() => navigate("/")}
                className="flex-1 bg-gradient-wine"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-secondary/5 to-background">
      {/* Header with Scores */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wine className="h-5 w-5 text-primary" />
              <span className="font-semibold">Question {currentQuestionIndex + 1}/16</span>
            </div>
            {wine && (
              <div className="text-sm text-muted-foreground hidden sm:block">
                🍷 {wine.name}
              </div>
            )}
          </div>

          {/* Players Scoreboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {players.map((player, idx) => (
              <div
                key={player.name}
                className={`p-2 rounded-lg border transition-all ${
                  idx === currentQuestionIndex % players.length
                    ? "bg-primary/10 border-primary shadow-md scale-105"
                    : "bg-muted/50 border-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{player.name}</span>
                  <Badge variant="secondary" className="font-bold">
                    {player.score}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Area */}
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto border-2 shadow-xl animate-fade-up">
          <CardContent className="pt-8 pb-6">
            {/* Question */}
            <div className="text-center mb-8">
              <Badge
                variant="outline"
                className="mb-4 text-base px-4 py-2 font-semibold"
              >
                Question {currentQuestionIndex + 1}
              </Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold leading-tight">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Answer Buttons */}
            <div className="space-y-3 mb-8">
              {currentQuestion.answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-lg border-2 text-left font-medium transition-all disabled:cursor-not-allowed ${getAnswerClass(
                    index
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span>{answer}</span>
                    {showResult && index === currentQuestion.correctAnswer && (
                      <span className="ml-auto">✅</span>
                    )}
                    {showResult &&
                      selectedAnswer === index &&
                      index !== currentQuestion.correctAnswer && (
                        <span className="ml-auto">❌</span>
                      )}
                  </div>
                </button>
              ))}
            </div>

            {/* Next Button */}
            {showResult && (
              <div className="text-center animate-fade-up">
                <Button
                  onClick={handleNextQuestion}
                  size="lg"
                  className="bg-gradient-wine px-8"
                >
                  {currentQuestionIndex < WINE_QUESTIONS.length - 1
                    ? "Question suivante"
                    : "Voir le classement final"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Player Indicator */}
        <div className="text-center mt-6 animate-fade-up">
          <p className="text-muted-foreground">
            🎯 C'est au tour de{" "}
            <span className="font-semibold text-foreground">
              {players[currentQuestionIndex % players.length]?.name}
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
