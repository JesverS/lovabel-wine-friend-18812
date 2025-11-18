interface SubsectionBlockProps {
  title: string;
  items: string[];
}

export default function SubsectionBlock({ title, items }: SubsectionBlockProps) {
  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <ul className="list-disc pl-5 text-foreground space-y-1">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
