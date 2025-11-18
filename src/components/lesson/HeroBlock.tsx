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
    <div className="rounded-2xl overflow-hidden shadow-lg bg-card border border-border/50 hover:shadow-xl transition-shadow duration-300">
      {/* Illustration */}
      <div className="h-52 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background/5 to-transparent"></div>
        <span className="text-8xl relative z-10 drop-shadow-lg">{emoji}</span>
      </div>

      {/* Content */}
      <div className="p-8 space-y-4">
        {data.title && (
          <h1 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
            {data.title}
          </h1>
        )}

        {(data.duration || data.level) && (
          <div className="flex items-center gap-3 text-sm">
            {data.duration && (
              <span className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1.5">
                <span>⏱</span>
                <span>{data.duration}</span>
              </span>
            )}
            {data.level && (
              <span className="px-4 py-2 rounded-full bg-secondary/10 text-secondary-foreground font-medium flex items-center gap-1.5">
                <span>🎓</span>
                <span>{data.level}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
