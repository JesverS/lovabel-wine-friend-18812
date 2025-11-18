interface TextBlockProps {
  value: string;
}

export default function TextBlock({ value }: TextBlockProps) {
  return <p className="text-foreground leading-relaxed">{value}</p>;
}
