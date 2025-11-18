interface SubsectionBlockProps {
  title: string;
  items: string[];
}

export default function SubsectionBlock({ title, items }: SubsectionBlockProps) {
  return (
    <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4 hover:bg-muted/40 transition-colors">
      <h3 className="font-semibold text-lg text-foreground">{title}</h3>
      <ul className="list-disc pl-6 text-foreground/90 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
}
