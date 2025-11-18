interface HighlightBlockProps {
  value: string;
}

export default function HighlightBlock({ value }: HighlightBlockProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 p-5 rounded-xl border-l-4 border-amber-400 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">⭐</span>
        <div>
          <strong className="font-semibold block mb-1">À retenir :</strong>
          <span className="text-amber-900/90 dark:text-amber-100/90">{value}</span>
        </div>
      </div>
    </div>
  );
}
