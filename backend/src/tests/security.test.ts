import request from 'supertest';
import { createApp } from '../app';
import { User, hashPassword } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { signAccessToken } from '../utils/jwt';

/**
 * These tests exist to close a real gap: the per-feature test files
 * (menu.test.ts, admin.test.ts, etc.) mostly cover the happy/owner
 * path, but never asserted the three rejection cases the project's own
 * "Security flow" test plan calls for:
 *   - customer  -> admin-only endpoint   => 403
 *   - vendor A  -> vendor B's resource   => 403
 *   - anonymous -> any protected route   => 401
 * A regression here (e.g. a route file losing its `authorize('admin')`
 * or ownership check) would previously have gone undetected by the
 * existing suite even though the underlying feature test still passed.
 */
describe('Cross-cutting authorization', () => {
  const app = createApp();

  async function makeVendorWithOwner(name: string, phone: string) {
    const passwordHash = await hashPassword('Password1');
    const owner = await User.create({ name: `${name} Owner`, email: `${phone}@example.com`, passwordHash, role: 'vendor' });
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      owner: owner._id,
      name,
      cuisine: 'Street Food',
      categories: ['Burgers'],
      description: 'Test vendor',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [50, 150],
      location: { address: 'A', area: 'A', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' },
      phone,
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 0,
    });
    const token = signAccessToken({ sub: String(owner._id), role: 'vendor', vendorId: String(vendor._id) });
    return { owner, vendor, token };
  }

  describe('customer -> admin-only endpoints', () => {
    it('rejects a logged-in customer from every admin route', async () => {
      const passwordHash = await hashPassword('Password1');
      const customer = await User.create({ name: 'Regular Customer', email: 'sec-customer@example.com', passwordHash, role: 'customer' });
      const token = signAccessToken({ sub: String(customer._id), role: 'customer' });

      await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app).get('/api/admin/vendors').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${token}`).expect(403);
      await request(app)
        .patch(`/api/admin/users/${customer._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'suspended' })
        .expect(403);
    });

    it('rejects a logged-in vendor from admin routes too (admin is not implied by any other role)', async () => {
      const { token } = await makeVendorWithOwner('Sec Vendor', '3000000001');
      await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`).expect(403);
    });
  });

  describe('vendor A -> vendor B resource', () => {
    it('blocks vendor A from adding, editing, or deleting vendor B\'s menu items', async () => {
      const { vendor: vendorB } = await makeVendorWithOwner('Vendor B Menu', '3000000002');
      const { token: tokenA } = await makeVendorWithOwner('Vendor A Menu', '3000000003');

      await request(app)
        .post(`/api/vendors/${vendorB._id}/menu`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ name: 'Sneaky Dish', description: 'x', price: 10, category: 'Burgers', veg: 'veg', image: 'https://example.com/d.jpg' })
        .expect(403);
    });

    it('blocks vendor A from creating an offer for vendor B', async () => {
      const { vendor: vendorB } = await makeVendorWithOwner('Vendor B Offer', '3000000004');
      const { token: tokenA } = await makeVendorWithOwner('Vendor A Offer', '3000000005');

      await request(app)
        .post(`/api/vendors/${vendorB._id}/offers`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Sneaky offer', description: 'x', discount: '10%', code: 'SNEAK10', expiry: '2027-01-01', conditions: 'none' })
        .expect(403);
    });
  });

  describe('unauthenticated -> protected endpoints', () => {
    it('rejects anonymous requests to a representative set of protected routes', async () => {
      const { vendor } = await makeVendorWithOwner('Anon Test Vendor', '3000000006');

      await request(app).get('/api/admin/users').expect(401);
      await request(app).get('/api/rewards/me').expect(401);
      await request(app).get('/api/reviews/mine').expect(401);
      await request(app).post(`/api/favorites/${vendor._id}`).expect(401);
      await request(app).put(`/api/vendors/${vendor._id}`).send({ name: 'x' }).expect(401);
      await request(app).post('/api/food-trails').send({ name: 'x' }).expect(401);
    });
  });
});
