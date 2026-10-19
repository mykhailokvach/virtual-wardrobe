import { segmentClass, segmentGroupClass } from '../../components/Button';
import { ShirtIcon, ShoeIcon } from '../../components/icons';
import type { ItemType } from '../../data/types';

const OPTIONS: { value: ItemType; label: string; Icon: typeof ShirtIcon }[] = [
  { value: 'clothes', label: 'Clothes', Icon: ShirtIcon },
  { value: 'shoes', label: 'Shoes', Icon: ShoeIcon },
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
          className={`${segmentClass(value === option.value)} flex items-center justify-center gap-2`}
        >
          <option.Icon className="h-4 w-4" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
