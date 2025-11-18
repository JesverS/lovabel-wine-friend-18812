interface HeroBlockProps {
  data: {
    title?: string;
    duration?: string;
    level?: string;
    illustration?: string;
    banner_url?: string;
  };
}

export default function HeroBlock({ data }: HeroBlockProps) {
  const illustrationEmojis: Record<string, string> = {
    vineyard: "🌄",
    grapes: "🍇",
    wine: "🍷",
    bottle: "🍾",
    cellar: "🏛️",
    default: "📚",
  };

  const emoji = data.illustration
    ? illustrationEmojis[data.illustration] || illustrationEmojis.default
    : illustrationEmojis.default;

  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-xl border border-gray-200">
      {/* Illustration ou Image */}
      <div className="h-40 sm:h-56 w-full bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
        {data.banner_url ? (
          <img 
            src={data.banner_url} 
            alt={data.title || "Illustration de la leçon"}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl sm:text-8xl drop-shadow">{emoji}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-4">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">{data.title}</h1>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {data.duration && (
            <span className="px-3 py-1.5 sm:px-4 rounded-full bg-rose-50 text-rose-600 font-medium">⏱ {data.duration}</span>
          )}

          {data.level && (
            <span className="px-3 py-1.5 sm:px-4 rounded-full bg-yellow-50 text-yellow-700 font-medium">🎓 {data.level}</span>
          )}
        </div>
      </div>
    </div>
  );
}
