import { Link } from 'react-router-dom';
import { Utensils, Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-brand-100 bg-brand-50 shadow-soft">
        <Utensils size={48} className="text-brand-600" />
      </div>
      <h1 className="mb-2 text-6xl font-extrabold text-charcoal-900">404</h1>
      <h2 className="mb-2 text-xl font-bold text-charcoal-800">Page not found</h2>
      <p className="mb-6 max-w-sm text-charcoal-500">Looks like this page took a wrong turn. Let's get you back to the good food.</p>
      <Link to="/" className="btn-primary"><Home size={18} /> Back to home</Link>
    </div>
  );
}
