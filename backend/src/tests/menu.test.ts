import request from 'supertest';
import { createApp } from '../app';
import { User, hashPassword } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { signAccessToken } from '../utils/jwt';

describe('Menu routes', () => {
  const app = createApp();

  it('allows vendor owner to add, update, and delete menu items', async () => {
    const passwordHash = await hashPassword('Password1');
    const vendorUser = await User.create({ name: 'MenuOwner', email: 'menuowner@example.com', passwordHash, role: 'vendor' });
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      owner: vendorUser._id,
      name: 'Menu Vendor',
      cuisine: 'Street Food',
      categories: ['Burgers'],
      description: 'M',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [30, 120],
      location: { address: 'M', area: 'M', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '10:00', close: '22:00', days: 'Mon - Sun' },
      phone: '2222222222',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 0,
    });

    const token = signAccessToken({ sub: String(vendorUser._id), role: 'vendor', vendorId: String(vendor._id) });

    const postRes = await request(app)
      .post(`/api/vendors/${vendor._id}/menu`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Dish', description: 'Yum', price: 99, category: 'Burgers', veg: 'veg', image: 'https://example.com/d.jpg' })
      .expect(201);

    const itemId = postRes.body.data.id;

    const listRes = await request(app).get(`/api/vendors/${vendor._id}/menu`).expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.some((i: any) => i.id === itemId)).toBe(true);

    await request(app).put(`/api/menu/${itemId}`).set('Authorization', `Bearer ${token}`).send({ price: 79 }).expect(200);

    const after = await request(app).get(`/api/vendors/${vendor._id}/menu`).expect(200);
    const updated = after.body.data.find((i: any) => i.id === itemId);
    expect(updated.price).toBe(79);

    await request(app).delete(`/api/menu/${itemId}`).set('Authorization', `Bearer ${token}`).expect(200);

    const after2 = await request(app).get(`/api/vendors/${vendor._id}/menu`).expect(200);
    expect(after2.body.data.some((i: any) => i.id === itemId)).toBe(false);
  });
});
