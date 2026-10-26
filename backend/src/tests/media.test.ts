import request from 'supertest';
import { createApp } from '../app';
import { User, hashPassword } from '../models/User.model';
import { signAccessToken } from '../utils/jwt';
import { Media } from '../models/Media.model';

// A real, tiny (68-byte) 1x1 transparent PNG, base64-encoded — small
// enough to keep the test fast, but a genuine valid PNG so the mime
// sniffing / decode path is exercised for real, not mocked.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`;

describe('Media', () => {
  const app = createApp();

  async function makeUser() {
    const passwordHash = await hashPassword('Password1');
    const user = await User.create({ name: 'Uploader', email: `uploader-${Date.now()}@example.com`, passwordHash });
    return { user, token: signAccessToken({ sub: String(user._id), role: 'customer' }) };
  }

  it('rejects an upload with no authentication', async () => {
    await request(app).post('/api/media').send({ dataUri: TINY_PNG_DATA_URI }).expect(401);
  });

  it('rejects a non-data-URI body', async () => {
    const { token } = await makeUser();
    await request(app)
      .post('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataUri: 'https://example.com/not-a-data-uri.png' })
      .expect(400);
  });

  it('stores a valid image and serves it back with the right content type', async () => {
    const { token, user } = await makeUser();

    const uploadRes = await request(app)
      .post('/api/media')
      .set('Authorization', `Bearer ${token}`)
      .send({ dataUri: TINY_PNG_DATA_URI })
      .expect(201);

    expect(uploadRes.body.data.url).toMatch(/^\/api\/media\/[a-f0-9]{24}$/);
    const mediaId = uploadRes.body.data.id;

    const stored = await Media.findById(mediaId);
    expect(stored).not.toBeNull();
    expect(stored?.mimeType).toBe('image/png');
    expect(String(stored?.uploader)).toBe(String(user._id));

    const getRes = await request(app).get(uploadRes.body.data.url).expect(200);
    expect(getRes.headers['content-type']).toBe('image/png');
    expect(getRes.headers['cache-control']).toContain('immutable');
  });

  it('returns 404 for a well-formed but nonexistent media id', async () => {
    await request(app).get('/api/media/507f1f77bcf86cd799439011').expect(404);
  });

  it('rejects a malformed media id', async () => {
    await request(app).get('/api/media/not-an-object-id').expect(400);
  });
});
