import { requireRole } from '../../lib/session.js';
import { deleteR2Object, objectKeyFromUrl } from '../../lib/r2.js';

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Database environment variables are missing.');
  return { url: url.replace(/\/$/, ''), key };
}

async function db(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...options.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Database request failed: ${response.status}`);
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  if (!requireRole(req, ['admin'])) return res.status(403).json({ error: 'Apenas o administrador pode alterar publicaÃ§Ãµes.' });
  try {
    const id = req.query.id;
    if (req.method === 'PUT') {
      const { author, title, description, type, image } = req.body || {};
      if (![author, title, description].every((value) => typeof value === 'string' && value.trim()) || author.length > 50 || title.length > 90 || description.length > 500) return res.status(400).json({ error: 'Confira o nome, o tÃ­tulo e a descriÃ§Ã£o.' });
      if (image && (!['image', 'video'].includes(type) || typeof image !== 'string' || !objectKeyFromUrl(image))) return res.status(400).json({ error: 'M?dia inv?lida.' });
      const previous = await db(`posts?id=eq.${encodeURIComponent(id)}&select=media_url`);
      if (!previous.length) return res.status(404).json({ error: 'PublicaÃ§Ã£o nÃ£o encontrada.' });
      const rows = await db(`posts?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ author: author.trim(), title: title.trim(), description: description.trim(), media_type: image ? type : null, media_url: image || null }) });
      if (previous[0].media_url && previous[0].media_url !== image) await deleteR2Object(previous[0].media_url).catch((error) => console.error('Unable to remove replaced blob', error));
      const row = rows[0];
      return res.status(200).json({ id: row.id, author: row.author, title: row.title, description: row.description, type: row.media_type || 'image', image: row.media_url || '', date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(row.created_at)), timestamp: Date.parse(row.created_at) });
    }
    if (req.method === 'DELETE') {
      const rows = await db(`posts?id=eq.${encodeURIComponent(id)}&select=media_url`, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      if (!rows.length) return res.status(404).json({ error: 'PublicaÃ§Ã£o nÃ£o encontrada.' });
      if (rows[0].media_url) await deleteR2Object(rows[0].media_url);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'NÃ£o foi possÃ­vel atualizar a publicaÃ§Ã£o.' });
  }
}

