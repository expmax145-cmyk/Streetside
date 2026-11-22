import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Utensils, CheckCircle2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/contexts/ToastContext';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { events, getVendorById } = useData();
  const event = events.find((e) => e.id === id) ?? null;

  if (!event) {
    return (
      <div className="container-app flex flex-col items-center justify-center py-20 text-center">
        <h1 className="mb-2 text-2xl font-bold text-charcoal-900">Event not found</h1>
        <Link to="/events" className="btn-primary">Browse events</Link>
      </div>
    );
  }

  const eventVendors = event.vendorIds.map((vid) => getVendorById(vid)).filter((v): v is NonNullable<typeof v> => v !== undefined);

  const handleRegister = () => {
    showToast('Registered for event! See you there.', 'success');
  };

  return (
    <div>
      <div className="relative h-64 overflow-hidden md:h-80">
        <img src={event.image} alt={event.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-charcoal-800 backdrop-blur hover:bg-white">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="container-app -mt-16 relative">
        <div className="card p-5 md:p-6">
          <h1 className="mb-3 text-2xl font-bold text-charcoal-900 md:text-3xl">{event.name}</h1>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-charcoal-500">
            <span className="flex items-center gap-1.5"><Calendar size={16} className="text-brand-500" /> {event.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={16} className="text-brand-500" /> {event.time}</span>
            <span className="flex items-center gap-1.5"><MapPin size={16} className="text-brand-500" /> {event.location}</span>
            <span className="flex items-center gap-1.5"><Users size={16} className="text-brand-500" /> {event.vendorIds.length} vendors</span>
          </div>
          <p className="mb-5 leading-relaxed text-charcoal-600">{event.longDescription}</p>
          <button onClick={handleRegister} className="btn-primary"><CheckCircle2 size={18} /> Register for free</button>
        </div>

        {/* Participating vendors */}
        <div className="mt-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-charcoal-900"><Utensils size={20} className="text-brand-500" /> Participating vendors</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {eventVendors.map((v) => (
              <Link key={v.id} to={`/vendor/${v.id}`} className="card card-hover group overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img src={v.image} alt={v.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-3">
                  <h4 className="truncate text-sm font-bold text-charcoal-900">{v.name}</h4>
                  <p className="truncate text-xs text-charcoal-500">{v.cuisine}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
