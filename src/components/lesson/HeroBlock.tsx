interface HeroBlockProps {
  data: {
    type?: "hero" | "section";
    title?: string;
    duration?: string;
    level?: string;
    illustration?: string;
  };
}

export default function HeroBlock({ data }: HeroBlockProps) {
  const illustrationEmojis: Record<string, string> = {
    vineyard: "🌄",
    grapes: "🍇",
    wine: "🍷",
    bottle: "🍾",
    cellar: "🏛️",
    default: "📚"
  };

  const emoji = data.illustration 
    ? illustrationEmojis[data.illustration] || illustrationEmojis.default
    : illustrationEmojis.default;

  return (
    <div className="rounded-2xl overflow-hidden shadow-md bg-card">
      {/* Illustration */}
      <div className="h-44 w-full bg-gradient-to-r from-primary/30 to-secondary/30 flex items-center justify-center">
        <span className="text-7xl">{emoji}</span>
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {data.title && <h1 className="text-2xl font-bold text-foreground">{data.title}</h1>}

        {(data.duration || data.level) && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {data.duration && (
              <span className="px-3 py-1 rounded-full bg-muted">
                ⏱ {data.duration}
              </span>
            )}
            {data.level && (
              <span className="px-3 py-1 rounded-full bg-muted">
                🎓 {data.level}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
