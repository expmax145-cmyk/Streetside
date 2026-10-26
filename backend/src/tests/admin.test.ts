import request from 'supertest';
import { createApp } from '../app';
import { User, hashPassword } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { Report } from '../models/Report.model';
import { signAccessToken } from '../utils/jwt';

describe('Admin routes', () => {
  const app = createApp();

  it('lists users and can change user status, and manages reports', async () => {
    const passwordHash = await hashPassword('AdminPass1');
    const admin = await User.create({ name: 'Admin', email: 'admin2@example.com', passwordHash, role: 'admin' });
    const token = signAccessToken({ sub: String(admin._id), role: 'admin' });

    const user = await User.create({ name: 'Normal', email: 'normal@example.com', passwordHash, role: 'customer' });

    const usersRes = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(usersRes.body.data)).toBe(true);
    expect(usersRes.body.data.some((u: any) => u.email === 'normal@example.com')).toBe(true);

    await request(app).patch(`/api/admin/users/${user._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'suspended' }).expect(200);
    const updated = await User.findById(user._id);
    expect(updated?.status).toBe('suspended');

    // Reports
    const vendor = await Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Reported Vendor',
      cuisine: 'Street Food',
      categories: ['Burgers'],
      description: 'X',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [50, 150],
      location: { address: 'R', area: 'R', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '09:00', close: '21:00', days: 'Mon - Sun' },
      phone: '1111111111',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 0,
    });

    const report = await Report.create({ type: 'vendor', targetId: vendor._id, reason: 'Spam', reporter: user._id });

    const reportsRes = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${token}`).expect(200);
    expect(Array.isArray(reportsRes.body.data)).toBe(true);
    expect(reportsRes.body.data.some((r: any) => r.id === String(report._id))).toBe(true);

    await request(app).patch(`/api/admin/reports/${report._id}`).set('Authorization', `Bearer ${token}`).send({ status: 'resolved' }).expect(200);
    const refreshed = await Report.findById(report._id);
    expect(refreshed?.status).toBe('resolved');
  });
});
