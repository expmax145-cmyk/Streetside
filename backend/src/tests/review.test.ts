import request from 'supertest';
import { createApp } from '../app';
import { Vendor } from '../models/Vendor.model';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';

describe('Review routes', () => {
  const app = createApp();

  it('allows an authenticated user to post a review and lists it', async () => {
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Review Vendor',
      cuisine: 'South Indian',
      categories: ['Dosa'],
      description: 'Test',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [30, 100],
      location: { address: 'X', area: 'Y', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '06:00', close: '14:00', days: 'Mon - Sun' },
      phone: '8888888888',
      veg: 'pure-veg',
      specialties: [],
      views: 0,
      popularity: 5,
    });

    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Reviewer', email: 'rev@example.com', passwordHash, role: 'customer' });
    const token = signAccessToken({ sub: String(user._id), role: 'customer' });

    const postRes = await request(app)
      .post(`/api/vendors/${vendor._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: 'Excellent' })
      .expect(201);

    expect(postRes.body.data).toHaveProperty('rating', 5);
    expect(postRes.body.data).toHaveProperty('comment', 'Excellent');

    await request(app)
      .post(`/api/vendors/${vendor._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, comment: 'Duplicate' })
      .expect(409);

    const listRes = await request(app).get(`/api/vendors/${vendor._id}/reviews`).expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
