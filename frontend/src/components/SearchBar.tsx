import { Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchBar({
  initialQuery = '',
  placeholder = 'Search for vendors, dishes, cuisines...',
}: {
  initialQuery?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form
      onSubmit={submit}
      className="relative w-full rounded-2xl bg-gradient-to-b from-brand-200 to-brand-100 p-1.5 shadow-raised-3d"
    >
      <Search size={18} className="pointer-events-none absolute left-6 top-1/2 z-10 -translate-y-1/2 text-brand-700/70" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input h-12 rounded-xl border-transparent bg-inset-3d-fill pl-11 pr-24 text-base text-charcoal-800 shadow-inset-3d focus:border-transparent focus:shadow-glow-focus"
        aria-label="Search"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery('')}
          aria-label="Clear search"
          className="absolute right-16 top-1/2 -translate-y-1/2 text-charcoal-400 transition-colors hover:text-charcoal-700"
        >
          <X size={18} />
        </button>
      ) : null}
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-btn-3d px-3 py-2 text-xs font-bold text-white shadow-raised-3d transition-all hover:bg-btn-3d-hover active:shadow-press-3d"
      >
        Search
      </button>
    </form>
  );
}
