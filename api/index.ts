import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../apps/api/src/app.ts';

type VercelRequest = IncomingMessage & { url?: string };

export default function handler(req: VercelRequest, res: ServerResponse) {
  const url = new URL(req.url || '/api/index', 'http://localhost');
  const route = (url.searchParams.get('_route') || '').replace(/^\/+/, '');
  url.searchParams.delete('_route');
  const qs = url.searchParams.toString();

  req.url = `/api/${route}${qs ? `?${qs}` : ''}`;
  return app(req as any, res as any);
}
