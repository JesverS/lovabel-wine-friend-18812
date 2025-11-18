export default function ListBlock({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-1 text-gray-700">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
