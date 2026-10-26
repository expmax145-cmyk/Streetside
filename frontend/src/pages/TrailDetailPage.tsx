import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Route, Clock, MapPin, CheckCircle2, Navigation, Star } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { SmartMap } from '@/components/SmartMap';
import { RatingStars } from '@/components/ToastContainer';
import { useToast } from '@/contexts/ToastContext';
import { vendorIsOpenNow } from '@/lib/format';
import type { Vendor } from '@/types';

const difficultyColor: Record<string, string> = {
  Easy: 'bg-success-100 text-success-700',
  Moderate: 'bg-gold-100 text-gold-700',
  Foodie: 'bg-danger-100 text-danger-600',
};

export function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { getVendorById, foodTrails, remoteLoading, remoteError, reloadVendors } = useData();
  const trail = foodTrails.find((t) => t.id === id);

  if (remoteLoading) return <div className="container-app py-20 text-center text-charcoal-500">Loading food trail...</div>;
  if (remoteError) return <div className="container-app py-20 text-center text-danger-700">Unable to load this food trail. <button onClick={() => reloadVendors()} className="btn-primary">Retry</button></div>;

  if (!trail) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Trail not found</h1>
        <Link to="/trails" className="btn-primary">Browse trails</Link>
      </div>
    );
  }

  const trailVendors: Vendor[] = trail.stops.map((s) => getVendorById(s.vendorId)).filter((v): v is Vendor => v !== undefined);

  const handleStart = () => {
    showToast('Trail started! Follow the stops in order.', 'success');
  };

  return (
    <div>
      <div className="relative h-56 overflow-hidden md:h-64">
        <img src={trail.image} alt={trail.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-charcoal-800 backdrop-blur hover:bg-white">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="container-app -mt-12 relative">
        <div className="card p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="badge bg-brand-50 text-brand-700"><Route size={12} /> Food trail</span>
                <span className={`badge ${difficultyColor[trail.difficulty]}`}>{trail.difficulty}</span>
              </div>
              <h1 className="mb-2 text-2xl font-bold text-charcoal-900 md:text-3xl">{trail.name}</h1>
              <p className="mb-3 max-w-2xl text-charcoal-600">{trail.description}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal-500">
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-brand-500" /> {trail.duration}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-500" /> {trail.distance}</span>
                <RatingStars rating={trail.rating} />
                <span className="text-charcoal-400">({trail.reviewCount} reviews)</span>
              </div>
            </div>
            <button onClick={handleStart} className="btn-primary shrink-0"><Navigation size={16} /> Start trail</button>
          </div>
        </div>

        {/* Stops */}
        <div className="mt-6">
          <h2 className="mb-4 text-xl font-bold text-charcoal-900">Trail stops ({trail.stops.length})</h2>
          <div className="space-y-4">
            {trail.stops.map((stop) => {
              const vendor = getVendorById(stop.vendorId);
              if (!vendor) return null;
              return (
                <div key={stop.order} className="card flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 font-bold text-white text-lg">{stop.order}</div>
                  <img src={vendor.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/vendor/${vendor.id}`} className="font-bold text-charcoal-900 hover:text-brand-600">{vendor.name}</Link>
                    <p className="text-sm text-charcoal-500">{stop.note}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-charcoal-400">
                      <span className="flex items-center gap-1"><Star size={11} fill="currentColor" className="text-gold-500" /> {vendor.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span>{vendor.location.area}</span>
                      <span>·</span>
                      <span className={vendorIsOpenNow(vendor) ? 'text-success-600 font-semibold' : 'text-danger-500'}>{vendorIsOpenNow(vendor) ? 'Open' : 'Closed'}</span>
                    </div>
                  </div>
                  <CheckCircle2 size={20} className="hidden shrink-0 text-charcoal-200 sm:block" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold text-charcoal-900">Trail map</h2>
          <SmartMap vendors={trailVendors} />
        </div>
      </div>
    </div>
  );
}
