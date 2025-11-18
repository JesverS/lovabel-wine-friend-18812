export default function HighlightBlock({ value }) {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5">
      <span className="font-bold">⭐ À retenir :</span> {value}
    </div>
  );
}
