export async function callDiscogsProxy(
  method: string,
  path: string,
  body: any,
  token: string
): Promise<any> {
  const response = await fetch(
    `/api/discogs?path=${encodeURIComponent(path)}`,
    {
      method,
      headers: {
        'x-discogs-token': token,
        'Content-Type': 'application/json',
      },
      ...(body && (method === 'POST' || method === 'PUT')
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  const text = await response.text();
  if (!response.ok) throw new Error(text || `HTTP ${response.status}`);

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}