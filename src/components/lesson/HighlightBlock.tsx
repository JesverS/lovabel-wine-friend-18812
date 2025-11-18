export default function HighlightBlock({ value }) {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 sm:p-6 text-sm sm:text-base">
      <span className="font-bold">⭐ À retenir :</span> {value}
    </div>
  );
}
