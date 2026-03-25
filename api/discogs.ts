import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-discogs-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = (req.query.path as string) || '';
  const token = (req.headers['x-discogs-token'] as string) || '';
  const method = req.method || 'GET';
  const targetUrl = `https://api.discogs.com${path}`;

  const body =
    method === 'POST' || method === 'PUT' ? JSON.stringify(req.body) : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers: {
      Authorization: `Discogs token=${token}`,
      'User-Agent': 'DiscogsAgent/1.0',
      'Content-Type': 'application/json',
    },
    body,
  });

  const text = await response.text();
  res.setHeader('Content-Type', 'application/json');
  return res.status(response.status).send(text || '{}');
}
