interface HighlightBlockProps {
  value: string;
}

export default function HighlightBlock({ value }: HighlightBlockProps) {
  return (
    <div className="bg-accent/20 text-accent-foreground p-4 rounded-xl border border-accent/30">
      <span className="text-lg">⭐</span> <strong>À retenir :</strong> {value}
    </div>
  );
}
