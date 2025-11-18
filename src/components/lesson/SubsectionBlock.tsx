export default function SubsectionBlock({ title, items }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

      <ul className="list-disc pl-6 space-y-2 text-gray-700">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
