import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  RotateCcw,
  Upload,
  XCircle,
} from 'lucide-react'
import { useAdminStudents, useBulkImport, useMessesSimple } from '@/hooks/use-admin'
import { downloadTextFile, parseCsv, toCsv } from '@/lib/csv'
import { cn, pluralize } from '@/lib/utils'
import type { ImportRecord, ImportResult } from '@/types/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageIntro } from '@/components/common/section-header'

interface PreviewRow {
  row: number
  record: ImportRecord
  errors: string[]
}

const REQUIRED_COLUMNS = ['name', 'roll_number', 'email', 'mess'] as const

export function AdminBulkImportPage() {
  const messesQuery = useMessesSimple()
  const studentsQuery = useAdminStudents()
  const bulkMutation = useBulkImport()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [stage, setStage] = useState<'input' | 'preview' | 'result'>('input')
  const [formError, setFormError] = useState<string | null>(null)

  const messes = useMemo(() => messesQuery.data ?? [], [messesQuery.data])
  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data])
  const loadingReference = messesQuery.isLoading || studentsQuery.isLoading

  const sampleCsv = useMemo(() => {
    const names = messes.length > 0 ? messes.map((mess) => mess.name) : ['Mess name']
    const rows: (string | number)[][] = [1, 2, 3].map((index) => [
      `Sample Student ${index}`,
      `IIT20249${String(index).padStart(2, '0')}`,
      `sample.student${index}@iiita.ac.in`,
      names[(index - 1) % names.length],
    ])
    return toCsv(['name', 'roll_number', 'email', 'mess'], rows)
  }, [messes])

  const reset = () => {
    setCsvText('')
    setFileName('')
    setRows([])
    setResult(null)
    setFormError(null)
    setStage('input')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const updateText = (value: string) => {
    setCsvText(value)
    setFormError(null)
    if (stage !== 'input') {
      setStage('input')
      setRows([])
      setResult(null)
    }
  }

  const readFile = async (file: File) => {
    setFormError(null)
    if (file.size > 1_000_000) {
      setFormError('CSV is too large. Keep the import under 1 MB per file.')
      return
    }
    try {
      const text = await file.text()
      setFileName(file.name)
      updateText(text)
    } catch {
      setFormError('That file could not be read. Try exporting it again as CSV.')
    }
  }

  const validate = () => {
    setFormError(null)
    const grid = parseCsv(csvText)
    if (grid.length === 0) {
      setFormError('Paste or upload a CSV first.')
      return
    }

    const header = grid[0].map((cell) => cell.trim().toLowerCase())
    const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column))
    if (missing.length > 0) {
      setFormError(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`)
      return
    }
    if (grid.length < 2) {
      setFormError('The CSV has a header but no student rows.')
      return
    }

    const indexOf = (column: string) => header.indexOf(column)
    const existingEmails = new Set(students.map((student) => student.profile.email.toLowerCase()))
    const existingRolls = new Set(students.map((student) => student.roll_number.toLowerCase()))
    const messByName = new Map(messes.map((mess) => [mess.name.trim().toLowerCase(), mess.name]))

    const parsed = grid.slice(1).map((cells, index) => {
      const value = (column: string) => cells[indexOf(column)]?.trim() ?? ''
      const record: ImportRecord = {
        name: value('name'),
        roll_number: value('roll_number'),
        email: value('email').toLowerCase(),
        mess: value('mess'),
      }
      return { row: index + 1, record, errors: [] as string[] }
    })

    const emailCounts = new Map<string, number>()
    const rollCounts = new Map<string, number>()
    for (const row of parsed) {
      if (row.record.email) emailCounts.set(row.record.email, (emailCounts.get(row.record.email) ?? 0) + 1)
      if (row.record.roll_number) {
        rollCounts.set(row.record.roll_number.toLowerCase(), (rollCounts.get(row.record.roll_number.toLowerCase()) ?? 0) + 1)
      }
    }

    for (const row of parsed) {
      const { record } = row
      if (record.name.length < 2) row.errors.push('Name is required')
      if (!/^[a-z0-9._%+-]+@iiita\.ac\.in$/.test(record.email)) {
        row.errors.push('Email must be a valid @iiita.ac.in address')
      }
      if (record.roll_number.length < 3) row.errors.push('Roll number is required')
      if (!record.mess) {
        row.errors.push('Mess is required')
      } else {
        const canonical = messByName.get(record.mess.toLowerCase())
        if (!canonical) {
          row.errors.push(`Mess “${record.mess}” does not exist`)
        } else {
          record.mess = canonical
        }
      }
      if (record.email && (emailCounts.get(record.email) ?? 0) > 1) {
        row.errors.push('Duplicate email in this file')
      }
      if (record.roll_number && (rollCounts.get(record.roll_number.toLowerCase()) ?? 0) > 1) {
        row.errors.push('Duplicate roll number in this file')
      }
      if (record.email && existingEmails.has(record.email)) {
        row.errors.push('Email already provisioned')
      }
      if (record.roll_number && existingRolls.has(record.roll_number.toLowerCase())) {
        row.errors.push('Roll number already provisioned')
      }
    }

    setRows(parsed)
    setStage('preview')
  }

  const validCount = rows.filter((row) => row.errors.length === 0).length
  const invalidCount = rows.length - validCount

  const runImport = () => {
    if (rows.length === 0) return
    bulkMutation.mutate(
      rows.map((row) => row.record),
      {
        onSuccess: (importResult) => {
          setResult(importResult)
          setStage('result')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro
        eyebrow="Campus administration"
        title="Bulk import"
        description="Provision students from a CSV. Valid records import; every failure is reported per row."
        action={
          stage !== 'input' ? (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="size-3.5" />
              Start over
            </Button>
          ) : undefined
        }
      />

      {stage === 'input' && (
        <>
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-card">
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (file) void readFile(file)
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 px-5 py-7 text-center"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Upload className="size-5" />
              </div>
              <p className="text-sm font-semibold">Upload a student CSV</p>
              <p className="mt-1 max-w-[250px] text-[11px] leading-relaxed text-muted-foreground">
                Drag a file here or choose one. Expected columns: name, roll_number, email, mess.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void readFile(file)
                }}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="size-3.5" />
                  Choose CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadTextFile('messmate-student-template.csv', sampleCsv)
                  }
                >
                  <Download className="size-3.5" />
                  Template
                </Button>
              </div>
              {fileName && (
                <p className="mt-3 max-w-full truncate rounded-full bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  {fileName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Or paste CSV</p>
                <span className="text-[10px] text-muted-foreground">{loadingReference ? 'Loading messes…' : `${pluralize(messes.length, 'mess', 'messes')} available`}</span>
              </div>
              <Textarea
                value={csvText}
                onChange={(event) => updateText(event.target.value)}
                rows={7}
                spellCheck={false}
                placeholder={'name,roll_number,email,mess\nAarav Mehta,IIT2023001,aarav.mehta@iiita.ac.in,BH1'}
                className="font-mono text-xs leading-relaxed"
                aria-label="CSV content"
              />
            </div>

            {formError && (
              <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-[11px] text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <p className="leading-relaxed">{formError}</p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={validate}
              disabled={!csvText.trim() || loadingReference}
            >
              {loadingReference ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Validate & preview
            </Button>
          </div>

          <div className="rounded-2xl bg-muted/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Mess names must match an existing mess exactly (case-insensitive). Emails must be
            @iiita.ac.in and can only be provisioned once per roll number and address.
          </div>
        </>
      )}

      {stage === 'preview' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-card">
              <p className="font-display text-xl font-semibold tabular">{rows.length}</p>
              <p className="text-[10px] text-muted-foreground">Rows</p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success-soft p-3 text-center text-success">
              <p className="font-display text-xl font-semibold tabular">{validCount}</p>
              <p className="text-[10px]">Valid</p>
            </div>
            <div
              className={cn(
                'rounded-2xl border p-3 text-center',
                invalidCount > 0
                  ? 'border-destructive/20 bg-destructive/5 text-destructive'
                  : 'border-border/70 bg-card text-muted-foreground',
              )}
            >
              <p className="font-display text-xl font-semibold tabular">{invalidCount}</p>
              <p className="text-[10px]">Needs fixes</p>
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="flex gap-2 rounded-xl border border-warning/25 bg-warning-soft p-3 text-[11px] leading-relaxed text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Invalid rows are not silently dropped — the server will report them individually and
              valid rows will still be imported. Fixing them first is recommended.
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <p className="text-xs font-semibold">Preview</p>
              <Badge variant="muted">{validCount} ready</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[10px]">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-semibold">#</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Roll</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Mess</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const valid = row.errors.length === 0
                    return (
                      <tr key={row.row} className="border-t border-border/50 align-top">
                        <td className="px-3 py-2 tabular">{row.row}</td>
                        <td className="px-3 py-2 font-medium">{row.record.name || '—'}</td>
                        <td className="px-3 py-2">{row.record.roll_number || '—'}</td>
                        <td className="px-3 py-2">{row.record.email || '—'}</td>
                        <td className="px-3 py-2">{row.record.mess || '—'}</td>
                        <td className="px-3 py-2">
                          {valid ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-success">
                              <CheckCircle2 className="size-3" />
                              Ready
                            </span>
                          ) : (
                            <div className="space-y-0.5 text-destructive">
                              {row.errors.map((error) => (
                                <p key={error} className="inline-flex items-start gap-1">
                                  <XCircle className="mt-0.5 size-3 shrink-0" />
                                  {error}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStage('input')}>
              <ArrowLeft className="size-4" />
              Edit CSV
            </Button>
            <Button
              className="flex-1"
              onClick={runImport}
              disabled={bulkMutation.isPending || rows.length === 0}
            >
              {bulkMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import {rows.length} rows
            </Button>
          </div>
        </>
      )}

      {stage === 'result' && result && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-success/20 bg-success-soft p-3 text-center text-success">
              <p className="font-display text-xl font-semibold tabular">{result.inserted}</p>
              <p className="text-[10px]">Imported</p>
            </div>
            <div
              className={cn(
                'rounded-2xl border p-3 text-center',
                result.failed > 0
                  ? 'border-destructive/20 bg-destructive/5 text-destructive'
                  : 'border-border/70 bg-card text-muted-foreground',
              )}
            >
              <p className="font-display text-xl font-semibold tabular">{result.failed}</p>
              <p className="text-[10px]">Failed</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-card">
              <p className="font-display text-xl font-semibold tabular">{result.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <p className="text-xs font-semibold">Import summary</p>
              <Badge variant={result.failed === 0 ? 'success' : 'warning'}>
                {result.failed === 0 ? 'All imported' : 'Completed with errors'}
              </Badge>
            </div>
            <div className="divide-y divide-border/50">
              {result.results.map((entry) => {
                const source = rows[entry.row - 1]
                return (
                  <div key={`${entry.row}-${entry.email}`} className="flex items-start gap-2.5 px-4 py-2.5">
                    {entry.status === 'imported' ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold">
                        {source?.record.name || entry.email || `Row ${entry.row}`}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {source?.record.roll_number || entry.roll_number} · {entry.email || '—'}
                      </p>
                      {entry.error && (
                        <p className="mt-0.5 text-[10px] font-medium text-destructive">{entry.error}</p>
                      )}
                    </div>
                    <Badge variant={entry.status === 'imported' ? 'success' : 'destructive'}>
                      {entry.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset}>
              <RotateCcw className="size-4" />
              Import another CSV
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
