import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  statement: string;
  correct_answer: boolean;
  explanation: string;
}

interface TrueFalseGameBlockProps {
  title?: string;
  description?: string;
  questions: Question[];
}

export default function TrueFalseGameBlock({ 
  title, 
  description, 
  questions 
}: TrueFalseGameBlockProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentIndex];
  const userAnswer = answers[currentQuestion?.id];
  const isAnswered = userAnswer !== undefined && userAnswer !== null;
  const isCorrect = isAnswered && userAnswer === currentQuestion.correct_answer;
  const isLastQuestion = currentIndex === questions.length - 1;
  const isGameComplete = Object.keys(answers).length === questions.length && showExplanation && isLastQuestion;

  const handleAnswer = (answer: boolean) => {
    if (isAnswered) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowExplanation(false);
  };

  const correctCount = Object.entries(answers).filter(
    ([id, answer]) => questions.find(q => q.id === id)?.correct_answer === answer
  ).length;

  if (isGameComplete) {
    return (
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
        {title && <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>}
        <div className="text-center py-6">
          <div className="text-4xl mb-4">
            {correctCount === questions.length ? "🎉" : correctCount >= questions.length / 2 ? "👍" : "📚"}
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">
            {correctCount} / {questions.length} bonnes réponses
          </p>
          <p className="text-muted-foreground mb-4">
            {correctCount === questions.length 
              ? "Parfait ! Tu maîtrises ce sujet !" 
              : correctCount >= questions.length / 2 
                ? "Bien joué ! Continue comme ça !" 
                : "Continue à apprendre, tu vas y arriver !"}
          </p>
          <Button onClick={handleRestart} variant="outline">
            Recommencer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20">
      {title && <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      
      {/* Progress */}
      <div className="flex gap-1 mb-4">
        {questions.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              idx < currentIndex 
                ? answers[questions[idx].id] === questions[idx].correct_answer 
                  ? "bg-green-500" 
                  : "bg-red-500"
                : idx === currentIndex 
                  ? "bg-primary" 
                  : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">
          Question {currentIndex + 1} / {questions.length}
        </p>
        <p className="text-lg font-medium text-foreground">{currentQuestion.statement}</p>
      </div>

      {/* Buttons */}
      {!isAnswered ? (
        <div className="flex gap-3">
          <Button
            onClick={() => handleAnswer(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="w-5 h-5 mr-2" />
            Vrai
          </Button>
          <Button
            onClick={() => handleAnswer(false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            <X className="w-5 h-5 mr-2" />
            Faux
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result */}
          <div className={cn(
            "p-4 rounded-xl border",
            isCorrect 
              ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" 
              : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-700 dark:text-green-400">Correct !</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    Incorrect - La réponse était : {currentQuestion.correct_answer ? "Vrai" : "Faux"}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
          </div>

          {/* Next button */}
          {!isLastQuestion && (
            <Button onClick={handleNext} className="w-full">
              Question suivante
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
