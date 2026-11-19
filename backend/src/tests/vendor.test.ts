import request from 'supertest';
import { createApp } from '../app';
import { Vendor } from '../models/Vendor.model';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';

describe('Vendor routes', () => {
  const app = createApp();

  it('lists vendors and returns vendor detail', async () => {
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Test Vendor',
      cuisine: 'Fast Food',
      categories: ['Burgers'],
      description: 'Tasty test burgers',
      longDescription: 'Long',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [50, 150],
      location: { address: 'Test St', area: 'TestArea', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '10:00', close: '22:00', days: 'Mon - Sun' },
      phone: '9999999999',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 10,
    });

    const listRes = await request(app).get('/api/vendors').expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    const ids = listRes.body.data.map((v: any) => v.id || v._id);
    expect(ids).toContain(String(vendor._id));

    const detailRes = await request(app).get(`/api/vendors/${vendor._id}`).expect(200);
    expect(detailRes.body.data).toHaveProperty('id');
    expect(detailRes.body.data.name).toBe('Test Vendor');
  });

  it('blocks a different vendor from updating the listing', async () => {
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Owned Vendor', cuisine: 'Fast Food', categories: ['Burgers'], description: 'Owned vendor test',
      image: 'https://example.com/img.jpg', location: { address: 'A', area: 'B', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' }, phone: '9999999998', veg: 'both', owner: undefined,
    });
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Other Vendor', email: 'other-vendor@example.com', passwordHash, role: 'vendor' });
    const token = signAccessToken({ sub: String(user._id), role: 'vendor' });

    await request(app)
      .put(`/api/vendors/${vendor._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Unauthorized Change' })
      .expect(403);
  });

  // vendor approval gate
  it('creates a new vendor as pending and hides it from the public list until approved', async () => {
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'New Vendor Owner', email: 'pending-owner@example.com', passwordHash, role: 'vendor' });
    const token = signAccessToken({ sub: String(user._id), role: 'vendor' });

    const createRes = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Brand New Cart', cuisine: 'Street Food', categories: ['Chaat'], description: 'Just registered',
        image: 'https://example.com/img.jpg', location: { address: 'A', area: 'B', lat: 16.5, lng: 80.6 },
        hours: { open: '10:00', close: '20:00', days: 'Mon - Sun' }, phone: '9998887776', veg: 'both',
      })
      .expect(201);

    // even though this field isn't in the vendor-controller
    // request body above, assert the server-computed value directly —
    // the client can never override it (see sanitizeVendorUpdate).
    expect(createRes.body.data.approvalStatus).toBe('pending');
    const vendorId = createRes.body.data.id || createRes.body.data._id;

    // Not visible in the public list
    const listRes = await request(app).get('/api/vendors').expect(200);
    const ids = listRes.body.data.map((v: any) => v.id || v._id);
    expect(ids).not.toContain(String(vendorId));

    // Not visible to an anonymous detail request either (404, not "here
    // it is but marked pending" — never leaks existence to the public)
    await request(app).get(`/api/vendors/${vendorId}`).expect(404);

    // But the owner can still see their own pending listing
    await request(app)
      .get(`/api/vendors/${vendorId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Admin approves it
    const adminHash = await hashPassword('Password1');
    const admin = await User.create({ name: 'Admin', email: 'approve-admin@example.com', passwordHash: adminHash, role: 'admin' });
    const adminToken = signAccessToken({ sub: String(admin._id), role: 'admin' });

    const approveRes = await request(app)
      .patch(`/api/admin/vendors/${vendorId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(approveRes.body.data.approvalStatus).toBe('approved');

    // Now it's publicly visible
    const listAfter = await request(app).get('/api/vendors').expect(200);
    const idsAfter = listAfter.body.data.map((v: any) => v.id || v._id);
    expect(idsAfter).toContain(String(vendorId));
  });

  it('lets an admin reject a pending vendor with a reason, which stays hidden from the public', async () => {
    const passwordHash = await hashPassword('Password1');
    const owner = await User.create({ name: 'Rejected Owner', email: 'rejected-owner@example.com', passwordHash, role: 'vendor' });
    const ownerToken = signAccessToken({ sub: String(owner._id), role: 'vendor' });

    const createRes = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Sketchy Cart', cuisine: 'Street Food', categories: ['Chaat'], description: 'Needs review',
        image: 'https://example.com/img.jpg', location: { address: 'A', area: 'B', lat: 16.5, lng: 80.6 },
        hours: { open: '10:00', close: '20:00', days: 'Mon - Sun' }, phone: '9998887775', veg: 'both',
      })
      .expect(201);
    const vendorId = createRes.body.data.id || createRes.body.data._id;

    const adminHash = await hashPassword('Password1');
    const admin = await User.create({ name: 'Admin2', email: 'reject-admin@example.com', passwordHash: adminHash, role: 'admin' });
    const adminToken = signAccessToken({ sub: String(admin._id), role: 'admin' });

    const rejectRes = await request(app)
      .patch(`/api/admin/vendors/${vendorId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Address could not be verified' })
      .expect(200);

    expect(rejectRes.body.data.approvalStatus).toBe('rejected');
    expect(rejectRes.body.data.rejectionReason).toBe('Address could not be verified');

    const listRes = await request(app).get('/api/vendors').expect(200);
    const ids = listRes.body.data.map((v: any) => v.id || v._id);
    expect(ids).not.toContain(String(vendorId));
  });

  // FSSAI/hygiene field permissions
  it('lets an owner set their FSSAI number but not hygieneRating/hygieneVerified', async () => {
    const vendor = await Vendor.create({
      approvalStatus: 'approved',
      name: 'Hygiene Test Vendor', cuisine: 'Fast Food', categories: ['Burgers'], description: 'test',
      image: 'https://example.com/img.jpg', location: { address: 'A', area: 'B', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' }, phone: '9999999997', veg: 'both',
    });
    const passwordHash = await hashPassword('Password1');
    const owner = await User.create({ name: 'Hygiene Owner', email: 'hygiene-owner@example.com', passwordHash, role: 'vendor', vendor: vendor._id });
    await Vendor.updateOne({ _id: vendor._id }, { owner: owner._id });
    const ownerToken = signAccessToken({ sub: String(owner._id), role: 'vendor' });

    const res = await request(app)
      .put(`/api/vendors/${vendor._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fssaiLicenseNumber: '12345678901234', hygieneRating: 5, hygieneVerified: true })
      .expect(200);

    expect(res.body.data.fssaiLicenseNumber).toBe('12345678901234');
    // -style allowlist: admin-only fields silently ignored from an owner
    expect(res.body.data.hygieneRating).toBeUndefined();
    expect(res.body.data.hygieneVerified).toBe(false);
  });

  it('lets an admin set hygieneRating and hygieneVerified', async () => {
    const vendor = await Vendor.create({
      approvalStatus: 'approved',
      name: 'Admin Hygiene Vendor', cuisine: 'Fast Food', categories: ['Burgers'], description: 'test',
      image: 'https://example.com/img.jpg', location: { address: 'A', area: 'B', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' }, phone: '9999999996', veg: 'both',
    });
    const adminHash = await hashPassword('Password1');
    const admin = await User.create({ name: 'Hygiene Admin', email: 'hygiene-admin@example.com', passwordHash: adminHash, role: 'admin' });
    const adminToken = signAccessToken({ sub: String(admin._id), role: 'admin' });

    const res = await request(app)
      .put(`/api/vendors/${vendor._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ hygieneRating: 4, hygieneVerified: true })
      .expect(200);

    expect(res.body.data.hygieneRating).toBe(4);
    expect(res.body.data.hygieneVerified).toBe(true);
  });
});
