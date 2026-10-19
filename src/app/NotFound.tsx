import { Link } from 'react-router';
import { buttonClass } from '../components/Button';

export function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-stone-600">We couldn't find that {what}.</p>
      <Link to="/" className={buttonClass('secondary', 'mt-6')}>
        Back to wardrobes
      </Link>
    </div>
  );
}
