import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'vozes_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return process.env.SESSION_SECRET;
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function cookie(req) {
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map((item) => {
    const split = item.trim().indexOf('=');
    return split < 0 ? ['', ''] : [item.trim().slice(0, split), decodeURIComponent(item.trim().slice(split + 1))];
  }));
  return cookies[COOKIE_NAME] || '';
}

export function createSession(role) {
  const payload = Buffer.from(JSON.stringify({ role, exp: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSession(req) {
  const token = cookie(req);
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function requireRole(req, roles) {
  const session = readSession(req);
  if (!session || !roles.includes(session.role)) return null;
  return session;
}
