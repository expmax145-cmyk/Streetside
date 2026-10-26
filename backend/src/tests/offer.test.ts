import request from 'supertest';
import { createApp } from '../app';
import { Vendor } from '../models/Vendor.model';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';

describe('Offer routes', () => {
  const app = createApp();

  it('allows vendor owner to create, list, and delete offers', async () => {
    const passwordHash = await hashPassword('Password1');
    const vendorUser = await User.create({ name: 'VendorOwner', email: 'owner@example.com', passwordHash, role: 'vendor' });

    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      owner: vendorUser._id,
      name: 'Offer Vendor',
      cuisine: 'Street Food',
      categories: ['Burgers'],
      description: 'Offers here',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [50, 150],
      location: { address: 'Offer St', area: 'OfferArea', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' },
      phone: '7777777777',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 1,
    });

    const token = signAccessToken({ sub: String(vendorUser._id), role: 'vendor', vendorId: String(vendor._id) });

    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const postRes = await request(app)
      .post(`/api/vendors/${vendor._id}/offers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Offer', description: 'Desc', discount: '10% off', code: 'TEST10', expiry, conditions: 'None' })
      .expect(201);

    expect(postRes.body.data).toHaveProperty('id');
    const offerId = postRes.body.data.id;

    const listRes = await request(app).get(`/api/vendors/${vendor._id}/offers`).expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((o: any) => o.id === offerId)).toBe(true);

    await request(app).delete(`/api/offers/${offerId}`).set('Authorization', `Bearer ${token}`).expect(200);

    const listRes2 = await request(app).get(`/api/vendors/${vendor._id}/offers`).expect(200);
    expect(listRes2.body.data.some((o: any) => o.id === offerId)).toBe(false);
  });
});
