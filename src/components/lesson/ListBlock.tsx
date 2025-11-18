interface ListBlockProps {
  items: string[];
}

export default function ListBlock({ items }: ListBlockProps) {
  return (
    <ul className="list-disc pl-6 text-foreground/90 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}
