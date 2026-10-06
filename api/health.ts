import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader('content-type', 'application/json; charset=utf-8');

  const required = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'Variáveis de ambiente ausentes.', missing }));
    return;
  }

  try {
    const { initializeDatabase } = await import('../apps/api/src/database/init.ts');
    const { pool } = await import('../apps/api/src/database/index.ts');
    await initializeDatabase();

    const adminEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase();
    const adminResult = await pool.query(
      `SELECT email, role, is_active FROM users WHERE email = $1 LIMIT 1`,
      [adminEmail]
    );
    const admin = adminResult.rows[0] || null;

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      service: 'controle-equipamentos-av-api',
      database: 'postgres',
      initialized: true,
      admin: admin ? { email: admin.email, role: admin.role, active: admin.is_active } : null
    }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Falha ao inicializar o banco.' }));
  }
}
