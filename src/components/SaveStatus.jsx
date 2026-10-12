const MAP = {
  saving: ['Saving…', 'text-slate-500'],
  saved: ['Draft saved', 'text-emerald-700'],
  error: ['Not saved. Will retry on your next change', 'text-red-700'],
};

export default function SaveStatus({ state }) {
  const item = MAP[state];
  if (!item) return null;
  return (
    <span role="status" className={`text-xs font-medium ${item[1]}`}>
      {item[0]}
    </span>
  );
}