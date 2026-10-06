import { createSession, readSession, sessionCookie } from '../lib/session.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const session = readSession(req);
    return res.status(200).json({ role: session?.role || null });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { username, password } = req.body || {};
  const credentials = [
    ['student', process.env.STUDENT_LOGIN, process.env.STUDENT_PASSWORD],
    ['admin', process.env.ADMIN_LOGIN, process.env.ADMIN_PASSWORD],
  ];
  const matched = credentials.find(([role, login, pass]) => login && pass && username === login && password === pass);
  if (!matched) return res.status(401).json({ error: 'Login ou senha incorretos.' });
  const token = createSession(matched[0]);
  res.setHeader('Set-Cookie', sessionCookie(token));
  return res.status(200).json({ role: matched[0] });
}


