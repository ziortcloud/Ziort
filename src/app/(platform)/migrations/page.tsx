import { readdir, readFile } from 'fs/promises'
import path from 'path'
import SqlMigrationViewer from '@/components/migrations/SqlViewer'

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations')

export const metadata = { title: 'SQL Migrations' }

export default async function MigrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ file?: string }>
}) {
  const { file: selectedFile } = await searchParams

  // Read file list
  const entries = await readdir(MIGRATIONS_DIR).catch(() => [] as string[])
  const sqlFiles = entries
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(name => {
      const parts = name.replace('.sql', '').split('_')
      const num   = parseInt(parts[0])
      const slug  = parts.slice(1).join('_')
      return { name, num, slug }
    })

  const activeFile = selectedFile && sqlFiles.find(f => f.name === selectedFile)
    ? selectedFile
    : sqlFiles[0]?.name ?? ''

  // Read initial file content on server
  let initialContent = ''
  if (activeFile) {
    initialContent = await readFile(path.join(MIGRATIONS_DIR, activeFile), 'utf-8')
      .catch(() => '-- File not found')
  }

  return (
    <SqlMigrationViewer
      files={sqlFiles}
      activeFile={activeFile}
      initialContent={initialContent}
    />
  )
}
