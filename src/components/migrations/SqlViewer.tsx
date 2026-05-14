'use client'
import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
  Search, Copy, CheckCheck, ChevronRight, Database,
  Table2, Zap, GitBranch, Shield, AlignLeft,
  X, Menu, Download, Play, Loader2, AlertTriangle,
  CheckCircle2, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MigFile { name: string; num: number; slug: string }

interface Props {
  files: MigFile[]
  activeFile: string
  initialContent: string
}

type RunResult = {
  rows?: Record<string, unknown>[]
  type?: 'select' | 'ddl'
  message?: string
  error?: string
  setup_required?: boolean
  hint?: string
  affected?: number
}

// ─── Ziort custom Prism theme ───────────────────────────────────────────────

const ziTheme: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    color: '#c9d1d9', background: 'none',
    fontFamily: '"DM Mono", "Fira Code", Menlo, monospace',
    fontSize: '13px', lineHeight: '1.75', textAlign: 'left',
    whiteSpace: 'pre', wordBreak: 'normal',
  },
  'pre[class*="language-"]': {
    color: '#c9d1d9', background: '#0d0e14',
    padding: '1.5rem', margin: '0', overflow: 'auto',
    borderRadius: '0', minHeight: '100%',
  },
  comment: { color: '#4a4f7a', fontStyle: 'italic' },
  prolog:  { color: '#4a4f7a' },
  keyword: { color: '#a5b4fc', fontWeight: 'bold' },
  'keyword.module': { color: '#a5b4fc' },
  builtin: { color: '#38bdf8' },
  'class-name': { color: '#79c0ff' },
  function: { color: '#d2a8ff' },
  string:   { color: '#fbbf24' },
  number:   { color: '#79c0ff' },
  boolean:  { color: '#ff9e64' },
  null:     { color: '#ff9e64' },
  operator: { color: '#f8f8ff' },
  punctuation: { color: '#4a4f7a' },
  'attr-name':  { color: '#79c0ff' },
  'attr-value': { color: '#f5a623' },
  property: { color: '#79c0ff' },
  tag:      { color: '#7c8cff' },
  symbol:   { color: '#00d4ff' },
  regex:    { color: '#ff9e64' },
  important: { color: '#f5a623', fontWeight: 'bold' },
  variable:  { color: '#c9d1d9' },
  entity:    { color: '#00d4ff', cursor: 'help' },
  url:       { color: '#00d4ff' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDisplayName(slug: string): string {
  if (slug.startsWith('zi')) {
    return 'Zi' + slug[2].toUpperCase() + slug.slice(3)
  }
  return slug.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

function parseSqlStats(sql: string) {
  return {
    tables:    (sql.match(/CREATE\s+TABLE/gi)                    ?? []).length,
    functions: (sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/gi) ?? []).length,
    triggers:  (sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER/gi)  ?? []).length,
    indexes:   (sql.match(/CREATE\s+(?:UNIQUE\s+)?INDEX/gi)      ?? []).length,
    policies:  (sql.match(/CREATE\s+POLICY/gi)                   ?? []).length,
    lines:     sql.split('\n').length,
  }
}

function getCategory(slug: string): string {
  if (['core_schema','code_sequences','billing','audit'].includes(slug)) return 'Core'
  if (slug.startsWith('zi')) return 'Products'
  return 'Other'
}

const CATEGORY_COLOR: Record<string, string> = {
  Core:     'text-zi-gold border-zi-gold/30 bg-zi-gold/5',
  Products: 'text-zi-cyan border-zi-cyan/30 bg-zi-cyan/5',
  Other:    'text-zi-muted border-white/10 bg-white/5',
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function Stat({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: number; label: string; color: string
}) {
  if (!value) return null
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${color}`}>
      <Icon size={11} />
      <span className="font-mono font-bold">{value}</span>
      <span className="opacity-70 hidden sm:inline">{label}</span>
    </div>
  )
}

// ─── File List Item ───────────────────────────────────────────────────────────

function FileItem({ file, active, onClick }: {
  file: MigFile; active: boolean; onClick: () => void
}) {
  const displayName = toDisplayName(file.slug)
  const category    = getCategory(file.slug)

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 relative
                  ${active
                    ? 'bg-orbit-navy border border-zi-cyan/30 shadow-[0_0_12px_rgba(0,212,255,0.08)]'
                    : 'hover:bg-orbit-navy/50 border border-transparent'
                  }`}
    >
      {active && (
        <motion.div
          layoutId="activeFile"
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-zi-cyan/5 to-transparent"
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      <div className="relative flex items-center gap-2.5">
        <span className={`font-mono text-[10px] w-6 text-center shrink-0
                          ${active ? 'text-zi-cyan' : 'text-zi-muted/50'}`}>
          {String(file.num).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate leading-none mb-0.5
                         ${active ? 'text-zi-white' : 'text-zi-muted hover:text-zi-white'}`}>
            {displayName}
          </p>
          <span className={`text-[10px] uppercase tracking-wider font-mono ${CATEGORY_COLOR[category]}`}>
            {category}
          </span>
        </div>
        {active && <ChevronRight size={12} className="text-zi-cyan shrink-0" />}
      </div>
    </motion.button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SqlMigrationViewer({ files, activeFile, initialContent }: Props) {
  const [selected,   setSelected]  = useState(activeFile)
  const [content,    setContent]   = useState(initialContent)
  const [loading,    setLoading]   = useState(false)
  const [copied,     setCopied]    = useState(false)
  const [search,     setSearch]    = useState('')
  const [drawer,     setDrawer]    = useState(false)
  const [running,    setRunning]   = useState(false)
  const [runResult,  setRunResult] = useState<RunResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  const stats = useMemo(() => parseSqlStats(content), [content])

  const selectFile = useCallback(async (filename: string) => {
    if (filename === selected) { setDrawer(false); return }
    setLoading(true)
    setDrawer(false)
    try {
      const res  = await fetch(`/api/migrations?file=${encodeURIComponent(filename)}`)
      const json = await res.json()
      setContent(json.content ?? '-- Error loading file')
      setSelected(filename)
    } catch {
      setContent('-- Network error')
    } finally {
      setLoading(false)
    }
  }, [selected])

  const copyContent = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }, [content])

  const runSql = useCallback(async () => {
    setRunning(true)
    setRunResult(null)
    setShowResult(true)
    try {
      const res  = await fetch('/api/migrations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: content }),
      })
      const json = await res.json()
      setRunResult(json)
    } catch {
      setRunResult({ error: 'Network error — could not reach the server' })
    } finally {
      setRunning(false)
    }
  }, [content])

  const downloadFile = useCallback(() => {
    const blob = new Blob([content], { type: 'text/sql' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = selected
    a.click()
    URL.revokeObjectURL(a.href)
  }, [content, selected])

  const filtered = useMemo(() =>
    files.filter(f =>
      toDisplayName(f.slug).toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase())
    ),
  [files, search])

  const displayName = selected
    ? toDisplayName(selected.replace('.sql', '').split('_').slice(1).join('_'))
    : ''

  // ── Sidebar panel (shared between desktop sidebar and mobile drawer) ───────

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zi-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter migrations…"
            className="w-full bg-orbit-midnight border border-white/8 rounded-md
                       pl-8 pr-3 py-2 text-xs text-zi-white placeholder:text-zi-muted/50
                       focus:outline-none focus:ring-1 focus:ring-zi-cyan/40 focus:border-zi-cyan/40"
          />
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <AnimatePresence mode="popLayout">
          {filtered.map(f => (
            <motion.div
              key={f.name}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              <FileItem file={f} active={selected === f.name} onClick={() => selectFile(f.name)} />
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-zi-muted text-xs">No migrations match</div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2.5 border-t border-white/5">
        <p className="text-[10px] text-zi-muted font-mono">
          {files.length} migration{files.length !== 1 ? 's' : ''} total
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-orbit-midnight">

      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-orbit-deep border-r border-white/5 shrink-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg bg-zi-cyan/10 border border-zi-cyan/20 flex items-center justify-center">
            <Database size={13} className="text-zi-cyan" />
          </div>
          <div>
            <p className="text-xs font-display font-bold text-zi-white leading-none">SQL Migrations</p>
            <p className="text-[10px] text-zi-muted mt-0.5">Supabase · PostgreSQL</p>
          </div>
        </div>
        {sidebarContent}
      </aside>

      {/* ── Main content area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <div className="h-12 md:h-14 flex items-center gap-3 px-3 md:px-4
                        bg-orbit-deep border-b border-white/5 shrink-0">

          {/* Mobile menu button */}
          <button
            onClick={() => setDrawer(true)}
            className="md:hidden p-1.5 rounded-md text-zi-muted hover:text-zi-white
                       hover:bg-orbit-navy transition-colors"
          >
            <Menu size={16} />
          </button>

          {/* File breadcrumb */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Database size={13} className="text-zi-cyan shrink-0 hidden sm:block" />
            <span className="text-zi-muted text-xs hidden sm:block">/</span>
            <span className="text-zi-white text-sm font-mono font-medium truncate">
              {selected}
            </span>
          </div>

          {/* Stats chips */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Stat icon={Table2}   value={stats.tables}    label="tables"    color="text-zi-cyan  border-zi-cyan/20  bg-zi-cyan/5"  />
            <Stat icon={Zap}      value={stats.functions} label="fns"       color="text-purple-400 border-purple-400/20 bg-purple-400/5" />
            <Stat icon={GitBranch}value={stats.triggers}  label="triggers"  color="text-zi-gold  border-zi-gold/20  bg-zi-gold/5"  />
            <Stat icon={Shield}   value={stats.policies}  label="policies"  color="text-green-400 border-green-400/20 bg-green-400/5" />
            <Stat icon={AlignLeft}value={stats.lines}     label="lines"     color="text-zi-muted border-white/10 bg-white/5"      />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <motion.button
              onClick={downloadFile}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-md text-zi-muted hover:text-zi-white hover:bg-orbit-navy
                         transition-colors hidden sm:flex"
              title="Download SQL"
            >
              <Download size={14} />
            </motion.button>

            <motion.button
              onClick={copyContent}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
                         transition-all duration-200 border
                         hover:border-zi-cyan/40 hover:text-zi-cyan
                         border-white/10 text-zi-muted"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }} className="flex items-center gap-1 text-green-400">
                    <CheckCheck size={13} /> Copied!
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }} className="flex items-center gap-1.5">
                    <Copy size={13} /> Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Run SQL button */}
            <motion.button
              onClick={runSql}
              disabled={running}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                         transition-all duration-200 bg-green-500/15 border border-green-500/30
                         text-green-400 hover:bg-green-500/25 hover:border-green-500/50
                         disabled:opacity-50 disabled:cursor-not-allowed"
              title="Execute this migration against the database"
            >
              {running
                ? <><Loader2 size={13} className="animate-spin" /> Running…</>
                : <><Play size={12} /> Run</>
              }
            </motion.button>
          </div>
        </div>

        {/* Mobile stats bar */}
        <div className="flex md:hidden items-center gap-2 px-3 py-2 bg-orbit-midnight border-b border-white/5 overflow-x-auto scrollbar-none">
          <Stat icon={Table2}   value={stats.tables}    label="tables"    color="text-zi-cyan  border-zi-cyan/20  bg-zi-cyan/5"  />
          <Stat icon={Zap}      value={stats.functions} label="fns"       color="text-purple-400 border-purple-400/20 bg-purple-400/5" />
          <Stat icon={GitBranch}value={stats.triggers}  label="triggers"  color="text-zi-gold  border-zi-gold/20  bg-zi-gold/5"  />
          <Stat icon={Shield}   value={stats.policies}  label="policies"  color="text-green-400 border-green-400/20 bg-green-400/5" />
          <Stat icon={AlignLeft}value={stats.lines}     label="lines"     color="text-zi-muted border-white/10 bg-white/5"      />
        </div>

        {/* SQL Content */}
        <div className="flex-1 overflow-hidden relative">
          {/* Loading shimmer overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 bg-orbit-midnight/80 backdrop-blur-sm
                           flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-zi-cyan/30 border-t-zi-cyan rounded-full"
                  />
                  <p className="text-xs text-zi-muted font-mono">Loading {selected}…</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prism highlighted SQL */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full overflow-auto"
            >
              <SyntaxHighlighter
                language="sql"
                style={ziTheme}
                showLineNumbers
                lineNumberStyle={{
                  color: '#2d3060',
                  paddingRight: '1.5rem',
                  minWidth: '3.5rem',
                  userSelect: 'none',
                  fontSize: '11px',
                }}
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  minHeight: '100%',
                  fontSize: '13px',
                  lineHeight: '1.75',
                }}
                wrapLongLines={false}
              >
                {content}
              </SyntaxHighlighter>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Run Result Panel */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/5 bg-orbit-midnight shrink-0 overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  {running ? (
                    <Loader2 size={12} className="text-zi-muted animate-spin" />
                  ) : runResult?.error ? (
                    <AlertTriangle size={12} className="text-red-400" />
                  ) : (
                    <CheckCircle2 size={12} className="text-green-400" />
                  )}
                  <span className="text-[11px] font-mono font-medium text-zi-muted">
                    {running ? 'Executing…' : runResult?.error ? 'Error' : `Result · ${runResult?.affected ?? runResult?.rows?.length ?? 0} row(s)`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowResult(v => !v)}
                    className="text-zi-muted hover:text-zi-white transition-colors">
                    <ChevronDown size={13} />
                  </button>
                  <button onClick={() => { setShowResult(false); setRunResult(null) }}
                    className="text-zi-muted hover:text-zi-white transition-colors">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Panel body */}
              <div className="max-h-52 overflow-auto px-4 py-3">
                {running && (
                  <div className="flex items-center gap-2 text-zi-muted text-xs font-mono">
                    <Loader2 size={13} className="animate-spin" /> Running query…
                  </div>
                )}

                {!running && runResult?.setup_required && (
                  <div className="space-y-2">
                    <p className="text-red-400 text-xs font-mono">{runResult.error}</p>
                    <div className="bg-orbit-navy rounded-lg p-3 border border-white/5">
                      <p className="text-zi-muted text-[11px] mb-2">Run this once in your Supabase SQL editor to enable the runner:</p>
                      <SyntaxHighlighter language="sql" style={ziTheme}
                        customStyle={{ background: 'transparent', padding: 0, margin: 0, fontSize: '11px' }}>
{`CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result jsonb;
BEGIN
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql || ') t' INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;`}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}

                {!running && runResult?.error && !runResult.setup_required && (
                  <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">{runResult.error}</p>
                )}

                {!running && !runResult?.error && runResult?.type === 'ddl' && (
                  <p className="text-green-400 text-xs font-mono">{runResult.message ?? 'Executed successfully'}</p>
                )}

                {!running && !runResult?.error && runResult?.type === 'select' && (
                  runResult.rows && runResult.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="text-[11px] font-mono border-collapse w-full">
                        <thead>
                          <tr>
                            {Object.keys(runResult.rows[0]).map(col => (
                              <th key={col} className="text-left pr-6 pb-1 text-zi-cyan/80 font-medium border-b border-white/5">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {runResult.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-white/3">
                              {Object.values(row).map((val, j) => (
                                <td key={j} className="pr-6 py-0.5 text-zi-white/80">
                                  {val === null ? <span className="text-zi-muted italic">null</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-zi-muted text-xs font-mono">No rows returned</p>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status bar (VS Code style) */}
        <div className="h-6 bg-zi-blue/60 flex items-center gap-4 px-3 shrink-0">
          <span className="text-[10px] text-white/70 font-mono">SQL · PostgreSQL</span>
          <span className="text-[10px] text-white/70 font-mono">{stats.lines} lines</span>
          <span className="text-[10px] text-white/70 font-mono ml-auto">{displayName}</span>
        </div>
      </div>

      {/* ── Mobile drawer (bottom sheet) ────────────────────────────────── */}
      <AnimatePresence>
        {drawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                         bg-orbit-deep rounded-t-2xl border-t border-white/10
                         flex flex-col"
              style={{ height: '70dvh' }}
            >
              {/* Drag handle */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-white/20 rounded-full" />
                  <span className="text-xs font-display font-bold text-zi-white ml-2">
                    Select Migration
                  </span>
                </div>
                <button onClick={() => setDrawer(false)}
                  className="text-zi-muted hover:text-zi-white p-1 rounded-md hover:bg-orbit-navy transition-colors">
                  <X size={16} />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
