import { Link } from 'react-router-dom';
import { Route, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { RatingStars } from '@/components/ToastContainer';

const difficultyColor: Record<string, string> = {
  Easy: 'bg-success-100 text-success-700',
  Moderate: 'bg-gold-100 text-gold-700',
  Foodie: 'bg-danger-100 text-danger-600',
};

export function FoodTrailsPage() {
  const { foodTrails, remoteLoading, remoteError, reloadVendors } = useData();
  if (remoteLoading) return <div className="container-app py-20 text-center text-charcoal-500">Loading food trails...</div>;
  if (remoteError) return <div className="container-app py-20 text-center text-danger-700">Unable to load food trails. <button onClick={() => reloadVendors()} className="btn-primary">Retry</button></div>;
  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Route size={26} className="text-brand-600" /> Food trails</h1>
        <p className="page-subtitle">Curated multi-stop food adventures. Follow a trail and taste the best of the city.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {foodTrails.map((trail, i) => (
          <Link key={trail.id} to={`/trails/${trail.id}`} className="card card-hover group overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="relative aspect-video overflow-hidden bg-charcoal-100">
              <img src={trail.image} alt={trail.name} className="img-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/75 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="badge bg-white text-charcoal-800 shadow-soft">{trail.stops.length} stops</span>
                <span className={`badge ${difficultyColor[trail.difficulty]}`}>{trail.difficulty}</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="mb-1 font-bold text-charcoal-900 group-hover:text-brand-700 transition-colors">{trail.name}</h3>
              <p className="mb-3 line-clamp-2 text-sm text-charcoal-500">{trail.description}</p>
              <div className="flex items-center justify-between text-xs text-charcoal-500">
                <RatingStars rating={trail.rating} />
                <span className="flex items-center gap-1"><Clock size={12} /> {trail.duration}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {trail.distance}</span>
              </div>
              <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2 transition-all">Start trail <ArrowRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
      {foodTrails.length === 0 && <div className="empty-state text-charcoal-500">No food trails available yet.</div>}
    </div>
  );
}
