import type { ItemType } from '../../data/types';

const OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'clothes', label: '👕 Clothes' },
  { value: 'shoes', label: '👟 Shoes' },
];

export function TypeToggle({ value, onChange }: { value: ItemType; onChange: (type: ItemType) => void }) {
  return (
    <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-10 rounded-lg text-sm font-medium ${
            value === option.value ? 'bg-white shadow-sm' : 'text-stone-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
