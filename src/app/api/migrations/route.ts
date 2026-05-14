// GET /api/migrations?file=016_zishop.sql  →  returns SQL content
// GET /api/migrations                       →  returns file list
import { readdir, readFile } from 'fs/promises'
import path from 'path'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const file = searchParams.get('file')

  if (file) {
    // Security: only allow .sql files, no path traversal
    if (!file.endsWith('.sql') || file.includes('..') || file.includes('/') || file.includes('\\')) {
      return Response.json({ error: 'Invalid filename' }, { status: 400 })
    }
    try {
      const content = await readFile(path.join(MIGRATIONS_DIR, file), 'utf-8')
      return Response.json({ file, content, lines: content.split('\n').length })
    } catch {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }
  }

  // Return file list
  try {
    const entries = await readdir(MIGRATIONS_DIR)
    const files = entries
      .filter(f => f.endsWith('.sql'))
      .sort()
      .map(name => {
        const parts = name.replace('.sql', '').split('_')
        const num   = parseInt(parts[0])
        const slug  = parts.slice(1).join('_')
        return { name, num, slug }
      })
    return Response.json({ files })
  } catch {
    return Response.json({ error: 'Cannot read migrations directory' }, { status: 500 })
  }
}
