import request from 'supertest';
import { createApp } from '../app';
import { Vendor } from '../models/Vendor.model';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';

describe('Rewards', () => {
  const app = createApp();

  async function makeVendor(overrides: Partial<Record<string, unknown>> = {}) {
    return Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name: 'Biryani Palace',
      cuisine: 'Biryani',
      categories: ['Biryani'],
      description: 'Test vendor',
      longDescription: '',
      image: 'https://example.com/img.jpg',
      logo: '',
      priceRange: [100, 300],
      location: { address: 'X', area: 'Y', city: 'Vijayawada', lat: 16.5, lng: 80.6 },
      hours: { open: '10:00', close: '22:00', days: 'Mon - Sun' },
      phone: '9999999999',
      veg: 'both',
      specialties: [],
      views: 0,
      popularity: 0,
      ...overrides,
    });
  }

  it('rejects unauthenticated access', async () => {
    await request(app).get('/api/rewards/me').expect(401);
  });

  it('gives a new user the signup bonus with a matching activity log entry', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'reward-signup@example.com', password: 'Password1' })
      .expect(201);

    // registration no longer returns a token in the body
    // (it's set as an httpOnly cookie instead) -- synthesize a Bearer
    // token for the same user id, matching the pattern the rest of this
    // file already uses for every other test.
    const token = signAccessToken({ sub: registerRes.body.data.user.id, role: 'customer' });
    const res = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);

    expect(res.body.data.points).toBe(100);
    expect(res.body.data.activities).toHaveLength(1);
    expect(res.body.data.activities[0]).toMatchObject({ action: 'Registered on StreetSide', points: 100 });
  });

  it('awards points for writing a review and reflects it in the balance and activity log', async () => {
    const vendor = await makeVendor();
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Reviewer', email: 'reward-review@example.com', passwordHash, role: 'customer' });
    const token = signAccessToken({ sub: String(user._id), role: 'customer' });

    const before = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);
    const startingPoints = before.body.data.points;

    await request(app)
      .post(`/api/vendors/${vendor._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, comment: 'Fantastic biryani' })
      .expect(201);

    const after = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body.data.points).toBe(startingPoints + 50);
    expect(after.body.data.activities[0].action).toContain('Wrote a review');
  });

  it('awards points for favoriting a vendor once, but not on a duplicate favorite', async () => {
    const vendor = await makeVendor({ name: 'Chaat Corner', cuisine: 'Street Food' });
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Favoriter', email: 'reward-fav@example.com', passwordHash, role: 'customer' });
    const token = signAccessToken({ sub: String(user._id), role: 'customer' });

    const before = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);
    const startingPoints = before.body.data.points;

    await request(app).post(`/api/favorites/${vendor._id}`).set('Authorization', `Bearer ${token}`).expect(201);
    await request(app).post(`/api/favorites/${vendor._id}`).set('Authorization', `Bearer ${token}`).expect(200); // duplicate, no-op

    const after = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(after.body.data.points).toBe(startingPoints + 20);
  });

  it('computes the Review Pro badge from real review counts, not a fixed value', async () => {
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Badge Tester', email: 'reward-badge@example.com', passwordHash, role: 'customer' });
    const token = signAccessToken({ sub: String(user._id), role: 'customer' });

    for (let i = 0; i < 5; i++) {
      const vendor = await makeVendor({ name: `Vendor ${i}`, cuisine: 'Street Food' });
      await request(app)
        .post(`/api/vendors/${vendor._id}/reviews`)
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 4, comment: `Review number ${i}` })
        .expect(201);
    }

    const res = await request(app).get('/api/rewards/me').set('Authorization', `Bearer ${token}`).expect(200);
    const reviewProBadge = res.body.data.badges.find((b: { id: string }) => b.id === 'review-pro');
    expect(reviewProBadge.earned).toBe(true);
    expect(reviewProBadge.progress).toBe(100);
  });
});
