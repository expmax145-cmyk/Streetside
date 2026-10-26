import request from 'supertest';
import { createApp } from '../app';
import { Vendor } from '../models/Vendor.model';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';

describe('Favorite routes', () => {
  const app = createApp();

  it('allows a user to favorite and unfavorite a vendor and list favorites', async () => {
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'FavUser', email: 'fav@example.com', passwordHash, role: 'customer' });
    const token = signAccessToken({ sub: String(user._id), role: 'customer' });

    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Fav Vendor',
      cuisine: 'Street Food',
      categories: ['Chaat'],
      description: 'Tasty',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [20, 80],
      location: { address: 'Fav St', area: 'FavArea', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '10:00', close: '22:00', days: 'Mon - Sun' },
      phone: '6666666666',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 2,
    });

    await request(app).post(`/api/favorites/${vendor._id}`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app).post(`/api/favorites/${vendor._id}`).set('Authorization', `Bearer ${token}`).expect(200);

    const listRes = await request(app).get('/api/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((v: any) => String(v.id || v._id) === String(vendor._id))).toBe(true);

    await request(app).delete(`/api/favorites/${vendor._id}`).set('Authorization', `Bearer ${token}`).expect(200);

    const listRes2 = await request(app).get('/api/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    expect(listRes2.body.data.some((v: any) => String(v.id || v._id) === String(vendor._id))).toBe(false);
  });
});
