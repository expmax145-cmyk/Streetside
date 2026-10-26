import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, Flame } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

export function EventsPage() {
  const { events } = useData();

  const featured = events.filter((e) => e.featured);
  const upcoming = events.filter((e) => !e.featured);

  return (
    <div className="container-app py-6 md:py-10">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Calendar size={26} className="text-brand-600" /> Events</h1>
        <p className="page-subtitle">Food festivals, night markets, and special events in your city</p>
      </div>

      {featured.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-charcoal-900 flex items-center gap-2"><Flame size={20} className="text-brand-600" /> Featured events</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {featured.map((event, i) => (
              <Link key={event.id} to={`/events/${event.id}`} className="card card-hover group overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="relative aspect-[16/9] overflow-hidden bg-charcoal-100">
                  <img src={event.image} alt={event.name} loading="lazy" className="img-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/75 to-transparent" />
                  <span className="absolute top-3 left-3 badge bg-btn-3d text-white shadow-raised-3d"><Flame size={11} /> Featured</span>
                </div>
                <div className="p-5">
                  <h3 className="mb-2 font-bold text-lg text-charcoal-900 group-hover:text-brand-600 transition-colors">{event.name}</h3>
                  <p className="mb-3 line-clamp-2 text-sm text-charcoal-500">{event.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-500">
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-brand-500" /> {event.date}</span>
                    <span className="flex items-center gap-1"><Clock size={12} className="text-brand-500" /> {event.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-brand-500" /> {event.area}</span>
                  </div>
                  <span className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">View details <ArrowRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold text-charcoal-800">More events</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event, i) => (
              <Link key={event.id} to={`/events/${event.id}`} className="card card-hover group overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="relative aspect-video overflow-hidden">
                  <img src={event.image} alt={event.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
                </div>
                <div className="p-4">
                  <h3 className="mb-1 font-bold text-charcoal-900 group-hover:text-brand-600 transition-colors">{event.name}</h3>
                  <p className="mb-2 line-clamp-2 text-sm text-charcoal-500">{event.description}</p>
                  <div className="flex items-center gap-3 text-xs text-charcoal-500">
                    <span className="flex items-center gap-1"><Calendar size={11} className="text-brand-500" /> {event.date}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-brand-500" /> {event.area}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!featured.length && !upcoming.length && <div className="py-16 text-center text-charcoal-500">No upcoming events yet.</div>}
    </div>
  );
}
