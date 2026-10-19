import { Link } from 'react-router';
import { buttonClass } from '../../components/Button';
import { PhotoImg } from '../../components/PhotoImg';
import { useWardrobes } from '../../data/hooks';

export function WardrobeListPage() {
  const { data: wardrobes } = useWardrobes();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="caps flex items-baseline gap-2 text-2xl">
          Your wardrobes
          {wardrobes && wardrobes.length > 0 && (
            <span className="font-mono text-sm font-normal tracking-normal text-muted">{wardrobes.length}</span>
          )}
        </h1>
        <Link to="/wardrobes/new" className={buttonClass()}>
          New wardrobe
        </Link>
      </div>

      {wardrobes?.length === 0 && (
        <div className="border border-dashed border-line2 p-8 text-center text-text3">
          <p>No wardrobes yet.</p>
          <p className="mt-1 text-sm text-muted">Take a photo of your wardrobe to get started.</p>
        </div>
      )}

      {wardrobes && wardrobes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {wardrobes.map((wardrobe) => (
            <li key={wardrobe.id}>
              <Link
                to={`/wardrobes/${wardrobe.id}`}
                className="group block border border-line bg-surface transition hover:border-accent"
              >
                <PhotoImg photoId={wardrobe.photoId} alt="" className="aspect-[3/4] w-full object-cover" />
                <span className="caps block truncate border-t border-line px-3 py-2.5 text-sm group-hover:text-accent-text">{wardrobe.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
