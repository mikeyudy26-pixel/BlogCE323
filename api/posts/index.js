import { requireRole } from '../../lib/session.js';
import { objectKeyFromUrl } from '../../lib/r2.js';

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database environment variables are missing.');
  return { url: url.replace(/\/$/, ''), key };
}

async function db(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(body || `Database request failed: ${response.status}`);
  return body ? JSON.parse(body) : null;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const rows = await db('posts?select=*&order=created_at.desc');
      return res.status(200).json(rows.map((row) => ({
        id: row.id, author: row.author, title: row.title, description: row.description,
        type: row.media_type || 'image', image: row.media_url || '', date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(row.created_at)), timestamp: Date.parse(row.created_at),
      })));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
    if (!requireRole(req, ['student', 'admin'])) return res.status(401).json({ error: 'Entre para publicar.' });
    const { author, title, description, type, image } = req.body || {};
    if (typeof author !== 'string' || !author.trim() || author.length > 50 || typeof title !== 'string' || !title.trim() || title.length > 90 || typeof description !== 'string' || !description.trim() || description.length > 500) {
      return res.status(400).json({ error: 'Confira o nome, o tÃ­tulo e a descriÃ§Ã£o.' });
    }
    if (image && (!['image', 'video'].includes(type) || typeof image !== 'string' || !objectKeyFromUrl(image))) {
      return res.status(400).json({ error: 'MÃ­dia invÃ¡lida.' });
    }
    const rows = await db('posts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ author: author.trim(), title: title.trim(), description: description.trim(), media_type: image ? type : null, media_url: image || null }) });
    const row = rows[0];
    return res.status(201).json({ id: row.id, author: row.author, title: row.title, description: row.description, type: row.media_type || 'image', image: row.media_url || '', date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(row.created_at)), timestamp: Date.parse(row.created_at) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'NÃ£o foi possÃ­vel acessar as publicaÃ§Ãµes.' });
  }
}


