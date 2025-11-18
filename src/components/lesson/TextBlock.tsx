interface TextBlockProps {
  value: string;
}

export default function TextBlock({ value }: TextBlockProps) {
  return <p className="text-foreground/90 text-base leading-relaxed">{value}</p>;
}
