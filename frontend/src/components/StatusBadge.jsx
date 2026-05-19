export function StatusBadge({ status }) {
  const classes =
    status >= 200 && status < 300
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : status >= 400 && status < 500
        ? "bg-amber-50 text-amber-700 border border-amber-200"
        : "bg-red-50 text-red-700 border border-red-200";
  return <span className={`badge ${classes}`}>{status}</span>;
}
