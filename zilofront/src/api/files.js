// Client-side file processing for Zilo chat attachments.
// All processing happens in the browser — no server upload needed.
//
// Supported formats:
//   Excel/CSV  → SheetJS (xlsx) → CSV text
//   Word .docx → mammoth → plain text
//   PDF        → pdfjs-dist → extracted text
//   Images     → FileReader → base64 data URL (for vision models)
//   Plain text → FileReader.text()

import * as XLSX from 'xlsx'
import mammoth from 'mammoth'

// ── Type helpers ──────────────────────────────────────────────────────────────

export function isImage(file) {
  return file.type.startsWith('image/')
}

export function isExcel(file) {
  const n = file.name.toLowerCase()
  return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'text/csv'
}

export function isWord(file) {
  const n = file.name.toLowerCase()
  return n.endsWith('.docx') || n.endsWith('.doc') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.type === 'application/msword'
}

export function isPDF(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function isText(file) {
  return file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md')
}

// ── Raw readers ───────────────────────────────────────────────────────────────

function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsArrayBuffer(file)
  })
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// ── Converters ────────────────────────────────────────────────────────────────

async function excelToText(file) {
  const buf = await readAsArrayBuffer(file)
  const wb  = XLSX.read(buf, { type: 'array' })
  // Pick first sheet with >2 columns, else first sheet
  const sheet = wb.SheetNames.find(name => {
    const ws  = wb.Sheets[name]
    const ref = ws['!ref']
    if (!ref) return false
    const range = XLSX.utils.decode_range(ref)
    return (range.e.c - range.s.c + 1) > 2
  }) ?? wb.SheetNames[0]
  const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheet])
  return `[Planilha: ${sheet}]\n${csv}`
}

async function wordToText(file) {
  const buf    = await readAsArrayBuffer(file)
  const result = await mammoth.extractRawText({ arrayBuffer: buf })
  return result.value
}

async function pdfToText(file) {
  try {
    // Dynamic import to avoid bundling the heavy worker at startup
    const pdfjsLib = await import('pdfjs-dist')
    // Use CDN worker to avoid bundler issues
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

    const buf  = await readAsArrayBuffer(file)
    const pdf  = await pdfjsLib.getDocument({ data: buf }).promise
    const pages = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text    = content.items.map(item => item.str).join(' ')
      pages.push(text)
    }
    return pages.join('\n\n')
  } catch (err) {
    // Fallback: return filename if pdf.js fails
    console.warn('PDF extraction failed:', err)
    return `[Não foi possível extrair o texto do PDF: ${file.name}]`
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Process a file and return an attachment object ready for /api/chat.
 *
 * Returns:
 *   { type: 'image', name, mimeType, dataUrl }   — for vision models
 *   { type: 'text',  name, mimeType, text }       — for document models
 */
export async function processFile(file) {
  if (isImage(file)) {
    const dataUrl = await readAsDataURL(file)
    return { type: 'image', name: file.name, mimeType: file.type, dataUrl }
  }

  let text = ''
  if (isExcel(file))     text = await excelToText(file)
  else if (isWord(file)) text = await wordToText(file)
  else if (isPDF(file))  text = await pdfToText(file)
  else                   text = await file.text()

  return { type: 'text', name: file.name, mimeType: file.type, text }
}

/**
 * Returns a human-readable label for the file type limitation.
 */
export function getModelFileSupport(orchName = '') {
  if (orchName.includes('Pesquisa Web')) {
    return { supportsImages: false, note: 'Perfil de pesquisa web não suporta análise de imagens' }
  }
  return { supportsImages: true, note: null }
}

export const ACCEPTED_TYPES = '.pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.gif'
