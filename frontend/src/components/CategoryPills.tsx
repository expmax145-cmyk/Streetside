import type { FoodCategory } from '@/types';

const pills: { name: FoodCategory | 'All'; emoji: string }[] = [
  { name: 'All', emoji: '🍽️' },
  { name: 'Biryani', emoji: '🍚' },
  { name: 'Dosa', emoji: '🥞' },
  { name: 'Momos', emoji: '🥟' },
  { name: 'Chaat', emoji: '🥘' },
  { name: 'Shawarma', emoji: '🌯' },
  { name: 'Burgers', emoji: '🍔' },
  { name: 'Desserts', emoji: '🍮' },
  { name: 'Tea & Coffee', emoji: '☕' },
  { name: 'Chinese', emoji: '🥡' },
  { name: 'Andhra Meals', emoji: '🍛' },
];

export function CategoryPills({ active, onSelect }: { active: string; onSelect: (cat: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {pills.map((p) => (
        <button
          key={p.name}
          onClick={() => onSelect(p.name)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            active === p.name
              ? 'bg-btn-3d text-white shadow-raised-3d -translate-y-px'
              : 'border border-charcoal-200 bg-gradient-to-b from-white to-cream-200 text-charcoal-600 shadow-soft hover:border-brand-300 hover:text-brand-700'
          }`}
        >
          <span aria-hidden="true">{p.emoji}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
}
