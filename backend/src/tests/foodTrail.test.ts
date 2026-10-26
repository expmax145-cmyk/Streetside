import request from 'supertest';
import { createApp } from '../app';
import { User, hashPassword } from '../models/User.model';
import { Vendor } from '../models/Vendor.model';
import { FoodTrail } from '../models/FoodTrail.model';
import { signAccessToken } from '../utils/jwt';

describe('Food trail admin routes', () => {
  const app = createApp();

  async function makeVendor(name: string) {
    return Vendor.create({
      approvalStatus: 'approved', // these tests predate the approval gate and expect immediate public visibility
      name,
      cuisine: 'Street Food',
      categories: ['Burgers'],
      description: 'A vendor used as a trail stop',
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
  }

  it('rejects unauthenticated and non-admin create attempts', async () => {
    const vendor = await makeVendor('Stop One');
    const body = {
      name: 'Old Town Crawl',
      description: 'A short evening trail',
      image: 'https://example.com/trail.jpg',
      duration: '2 hours',
      distance: '1.5 km',
      difficulty: 'Easy',
      stops: [{ order: 1, vendor: String(vendor._id), note: 'Start here' }],
    };

    await request(app).post('/api/food-trails').send(body).expect(401);

    const passwordHash = await hashPassword('CustomerPass1');
    const customer = await User.create({ name: 'Cust', email: 'cust-ft@example.com', passwordHash, role: 'customer' });
    const customerToken = signAccessToken({ sub: String(customer._id), role: 'customer' });

    await request(app)
      .post('/api/food-trails')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(body)
      .expect(403);
  });

  it('allows an admin to create, update, and delete a food trail', async () => {
    const passwordHash = await hashPassword('AdminPass1');
    const admin = await User.create({ name: 'Admin', email: 'admin-ft@example.com', passwordHash, role: 'admin' });
    const token = signAccessToken({ sub: String(admin._id), role: 'admin' });

    const vendorA = await makeVendor('Stop A');
    const vendorB = await makeVendor('Stop B');

    const createRes = await request(app)
      .post('/api/food-trails')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Old Town Crawl',
        description: 'A short evening trail',
        image: 'https://example.com/trail.jpg',
        duration: '2 hours',
        distance: '1.5 km',
        difficulty: 'Easy',
        stops: [{ order: 1, vendor: String(vendorA._id), note: 'Start here' }],
      })
      .expect(201);

    const trailId = createRes.body.data.id;
    expect(createRes.body.data.name).toBe('Old Town Crawl');

    const stored = await FoodTrail.findById(trailId);
    expect(String(stored?.createdBy)).toBe(String(admin._id));

    const updateRes = await request(app)
      .put(`/api/food-trails/${trailId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Old Town Crawl (Extended)',
        stops: [
          { order: 1, vendor: String(vendorA._id), note: 'Start here' },
          { order: 2, vendor: String(vendorB._id), note: 'Second stop' },
        ],
      })
      .expect(200);

    expect(updateRes.body.data.name).toBe('Old Town Crawl (Extended)');
    expect(updateRes.body.data.stops).toHaveLength(2);

    await request(app).delete(`/api/food-trails/${trailId}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(await FoodTrail.findById(trailId)).toBeNull();
  });

  it('rejects a trail with no stops', async () => {
    const passwordHash = await hashPassword('AdminPass1');
    const admin = await User.create({ name: 'Admin2', email: 'admin-ft2@example.com', passwordHash, role: 'admin' });
    const token = signAccessToken({ sub: String(admin._id), role: 'admin' });

    await request(app)
      .post('/api/food-trails')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Empty Trail',
        description: 'No stops',
        image: 'https://example.com/trail.jpg',
        duration: '1 hour',
        distance: '0 km',
        difficulty: 'Easy',
        stops: [],
      })
      .expect(400);
  });
});
