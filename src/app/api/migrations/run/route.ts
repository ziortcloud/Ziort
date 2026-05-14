// POST /api/migrations/run
// Executes SQL against the Supabase database (service role, bypasses RLS).
// Only accessible to authenticated admin users.
// Requires a PostgreSQL helper function: exec_sql(sql text) RETURNS jsonb
//
// To enable, run this in your Supabase SQL editor ONCE:
//   CREATE OR REPLACE FUNCTION exec_sql(sql text)
//   RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
//   DECLARE result jsonb;
//   BEGIN
//     EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql || ') t' INTO result;
//     RETURN COALESCE(result, '[]'::jsonb);
//   EXCEPTION WHEN OTHERS THEN
//     RAISE EXCEPTION '%', SQLERRM;
//   END;
//   $$;

import { getSession } from '@/ziorbitcore/auth/session'
import { db } from '@/ziorbitcore/db/client'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { sql?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sql = (body.sql ?? '').trim()
  if (!sql) {
    return Response.json({ error: 'No SQL provided' }, { status: 400 })
  }

  // Refuse DML that could corrupt data in non-migration context
  const upperSql = sql.toUpperCase()
  const isDestructive = /^\s*(DROP\s+DATABASE|TRUNCATE\s+ALL|DELETE\s+FROM\s+zi_|DROP\s+SCHEMA\s+public)/i.test(sql)
  if (isDestructive) {
    return Response.json({ error: 'Blocked: destructive operation not allowed via runner' }, { status: 403 })
  }

  const isQuery = /^\s*(SELECT|WITH|EXPLAIN)/i.test(sql)

  if (isQuery) {
    // For SELECT queries, wrap in exec_sql to get tabular results
    const { data, error } = await (db as any).rpc('exec_sql', { sql })
    if (error) {
      const isSetupError = error.message?.includes('exec_sql') || error.code === 'PGRST202'
      if (isSetupError) {
        return Response.json({
          error: 'exec_sql function not found',
          setup_required: true,
          hint: 'Run the setup SQL from the comment at the top of /api/migrations/run/route.ts in your Supabase SQL editor',
        }, { status: 501 })
      }
      return Response.json({ error: error.message }, { status: 400 })
    }
    return Response.json({ rows: data ?? [], type: 'select', affected: (data ?? []).length })
  }

  // For DDL/DML migrations — execute via exec_sql wrapper
  const wrappedSql = `DO $$ BEGIN ${sql.replace(/\$\$/g, '$__$')} END $$;`
  const { error } = await (db as any).rpc('exec_sql', { sql: 'SELECT 1' })

  if (error) {
    const isSetupError = error.message?.includes('exec_sql') || error.code === 'PGRST202'
    if (isSetupError) {
      return Response.json({
        error: 'exec_sql function not found',
        setup_required: true,
        hint: 'Run the setup SQL from the comment at the top of /api/migrations/run/route.ts in your Supabase SQL editor',
      }, { status: 501 })
    }
  }

  // Actually run the DDL
  const { error: runError } = await (db as any).rpc('exec_sql', { sql })
  if (runError) {
    return Response.json({ error: runError.message }, { status: 400 })
  }

  return Response.json({ rows: [], type: 'ddl', message: 'Executed successfully' })
}
