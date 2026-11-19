import api from './api';

export async function listFavorites(){
  const res = await api.get('/favorites');
  return res.data;
}

export async function addFavorite(vendorId: string){
  const res = await api.post(`/favorites/${vendorId}`);
  return res.data;
}

export async function removeFavorite(vendorId: string){
  const res = await api.del(`/favorites/${vendorId}`);
  return res.data;
}

export default { listFavorites, addFavorite, removeFavorite };
