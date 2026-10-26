import api from './api';

// The backend returns a path like "/api/media/<id>" — relative to its
// own origin. In development the frontend (5173) and backend (5001) run
// on different ports, so a bare "/api/media/<id>" <img src> would
// resolve against the FRONTEND's origin and 404. Resolve it against the
// backend's actual origin instead (same origin API_URL already points
// requests at).
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5001/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

function toAbsoluteMediaUrl(relativeUrl: string): string {
  return relativeUrl.startsWith('http') ? relativeUrl : `${API_ORIGIN}${relativeUrl}`;
}

// uploads a compressed data: URI (produced by
// lib/imageUpload.ts) to the backend's Media collection and returns a
// short, cacheable, absolute /api/media/:id URL to store on the owning
// document instead of embedding the base64 bytes inline.
export async function uploadImage(dataUri: string): Promise<string> {
  const res = await api.post('/media', { dataUri });
  const data = res.data as { url?: string };
  if (!data.url) throw new Error('Upload did not return a URL');
  return toAbsoluteMediaUrl(data.url);
}

export default { uploadImage };
