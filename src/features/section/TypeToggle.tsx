import { segmentClass, segmentGroupClass } from '../../components/Button';
import type { ItemType } from '../../data/types';

const OPTIONS: { value: ItemType; label: string }[] = [
  { value: 'clothes', label: 'Clothes' },
  { value: 'shoes', label: 'Shoes' },
];

export function TypeToggle({ value, onChange }: { value: ItemType; onChange: (type: ItemType) => void }) {
  return (
    <div role="radiogroup" aria-label="Type" className={segmentGroupClass}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={segmentClass(value === option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
