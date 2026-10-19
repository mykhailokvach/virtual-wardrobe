import { Link } from 'react-router';
import { buttonClass } from '../../components/Button';
import { PhotoImg } from '../../components/PhotoImg';
import { useWardrobes } from '../../data/hooks';

export function WardrobeListPage() {
  const { data: wardrobes } = useWardrobes();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Your wardrobes</h1>
        <Link to="/wardrobes/new" className={buttonClass()}>
          New wardrobe
        </Link>
      </div>

      {wardrobes?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center text-stone-600">
          <p>No wardrobes yet.</p>
          <p className="mt-1 text-sm">Take a photo of your wardrobe to get started.</p>
        </div>
      )}

      {wardrobes && wardrobes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {wardrobes.map((wardrobe) => (
            <li key={wardrobe.id}>
              <Link
                to={`/wardrobes/${wardrobe.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
              >
                <PhotoImg photoId={wardrobe.photoId} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="block truncate p-3 text-sm font-medium">{wardrobe.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
