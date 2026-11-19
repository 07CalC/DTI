export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  const input = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n') {
      row.push(cell.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)

  return rows
}

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
