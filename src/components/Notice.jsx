const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-slate-200 bg-slate-100 text-slate-700',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
};

export default function Notice({ type = 'info', children }) {
  if (!children) return null;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${STYLES[type] || STYLES.info}`}
    >
      {children}
    </div>
  );
}
