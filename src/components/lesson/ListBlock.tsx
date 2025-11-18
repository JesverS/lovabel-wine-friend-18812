interface ListBlockProps {
  items: string[];
}

export default function ListBlock({ items }: ListBlockProps) {
  return (
    <ul className="list-disc pl-5 text-foreground space-y-1">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
