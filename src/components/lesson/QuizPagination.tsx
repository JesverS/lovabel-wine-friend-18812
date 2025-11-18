import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronRight, ChevronLeft } from "lucide-react";

interface QuizPaginationProps {
  quizzes: Array<[string, {
    question: string;
    text?: string;
    answers: string[];
    correct_answer: string;
  }]>;
  onComplete: (answers: Record<string, string>) => void;
  isCompleted?: boolean;
}

export default function QuizPagination({ quizzes, onComplete, isCompleted }: QuizPaginationProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const totalQuestions = quizzes.length;
  const currentQuiz = quizzes[currentQuestionIndex];
  const [quizKey, quizData] = currentQuiz;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const hasAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === quizData.correct_answer;

  const handleSelectAnswer = (answer: string) => {
    if (showFeedback) return; // Déjà répondu
    
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    const newAnswers = { ...answers, [quizKey]: answer };
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Terminer le quiz
      onComplete(answers);
    } else {
      // Question suivante
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const previousKey = quizzes[currentQuestionIndex - 1][0];
      setSelectedAnswer(answers[previousKey] || null);
      setShowFeedback(!!answers[previousKey]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs sm:text-sm font-medium text-gray-600">
            Question {currentQuestionIndex + 1} sur {totalQuestions}
          </span>
          <span className="text-xs sm:text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 rounded-3xl shadow-lg">
        <div className="text-4xl sm:text-5xl mb-4 text-center">🍷</div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
          {quizData.question}
        </h3>
        {quizData.text && (
          <p className="mt-3 text-sm sm:text-base text-gray-600 text-center">{quizData.text}</p>
        )}
      </Card>

      {/* Answer Options */}
      <div className="grid gap-3">
        {quizData.answers.map((answer) => {
          const isSelected = selectedAnswer === answer;
          const isCorrectAnswer = answer === quizData.correct_answer;
          const showAsCorrect = showFeedback && isSelected && isCorrect;
          const showAsIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <Button
              key={answer}
              variant="outline"
              className={`justify-start text-left h-auto py-4 sm:py-5 px-4 sm:px-6 rounded-2xl transition-all duration-200 text-sm sm:text-base ${
                showAsCorrect
                  ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                  : showAsIncorrect
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-600"
                  : isSelected && !showFeedback
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleSelectAnswer(answer)}
              disabled={showFeedback}
            >
              <span className="flex items-center gap-3 flex-1">
                {showFeedback && isSelected && (
                  isCorrect ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                  )
                )}
                <span className="flex-1">{answer}</span>
              </span>
            </Button>
          );
        })}
      </div>

      {/* Feedback for incorrect answer */}
      {showFeedback && !isCorrect && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-md animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="text-2xl sm:text-3xl">💡</div>
            <div className="flex-1">
              <p className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Pas tout à fait !
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                ✅ La bonne réponse est : <span className="font-bold text-green-700">{quizData.correct_answer}</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Success feedback for correct answer */}
      {showFeedback && isCorrect && (
        <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-md animate-fade-in">
          <div className="flex items-center gap-3 justify-center">
            <div className="text-2xl sm:text-3xl">🎉</div>
            <p className="text-sm sm:text-base font-semibold text-green-700">
              Bravo, bonne réponse !
            </p>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        {currentQuestionIndex > 0 && (
          <Button
            onClick={handlePrevious}
            variant="outline"
            className="gap-2 px-4 py-2 sm:px-6 sm:py-5 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>
        )}
        
        <div className="flex-1" />
        
        {hasAnswered && (
          <Button
            onClick={handleNext}
            className="gap-2 px-4 py-2 sm:px-6 sm:py-5 rounded-xl bg-[#7A1F24] hover:bg-[#66191E]"
          >
            <span className="hidden sm:inline">
              {isLastQuestion ? "Terminer le quiz" : "Question suivante"}
            </span>
            <span className="sm:hidden">
              {isLastQuestion ? "Terminer" : "Suivant"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
