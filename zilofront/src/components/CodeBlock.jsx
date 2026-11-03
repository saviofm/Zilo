import { useEffect, useRef, useState } from 'react'
import { Copy, Check } from 'lucide-react'

// Dynamic highlight.js import to keep initial bundle small
async function highlight(code, language) {
  try {
    const hljs = await import('highlight.js/lib/core')
    const lang = language?.toLowerCase()
    const loaders = {
      python:     () => import('highlight.js/lib/languages/python'),
      javascript: () => import('highlight.js/lib/languages/javascript'),
      js:         () => import('highlight.js/lib/languages/javascript'),
      typescript: () => import('highlight.js/lib/languages/typescript'),
      ts:         () => import('highlight.js/lib/languages/typescript'),
      sql:        () => import('highlight.js/lib/languages/sql'),
      bash:       () => import('highlight.js/lib/languages/bash'),
      shell:      () => import('highlight.js/lib/languages/bash'),
      json:       () => import('highlight.js/lib/languages/json'),
      yaml:       () => import('highlight.js/lib/languages/yaml'),
      xml:        () => import('highlight.js/lib/languages/xml'),
      html:       () => import('highlight.js/lib/languages/xml'),
      css:        () => import('highlight.js/lib/languages/css'),
      java:       () => import('highlight.js/lib/languages/java'),
      abap:       () => import('highlight.js/lib/languages/javascript'), // fallback
    }
    if (loaders[lang]) {
      const mod = await loaders[lang]()
      hljs.default.registerLanguage(lang, mod.default)
    }
    const result = hljs.default.highlight(code, { language: lang || 'plaintext', ignoreIllegals: true })
    return result.value
  } catch {
    return code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  }
}

export default function CodeBlock({ data }) {
  const { language, code, title } = data || {}
  const [html, setHtml] = useState('')
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!code) return
    highlight(code, language).then(setHtml)
  }, [code, language])

  function handleCopy() {
    navigator.clipboard.writeText(code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: '#1e1e2e', borderRadius: 12, overflow: 'hidden', marginBottom: 12, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{language || 'code'}</span>
          {title && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>— {title}</span>}
        </div>
        <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--accent)' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
      <pre ref={ref} style={{ margin: 0, padding: '16px', overflowX: 'auto', fontSize: 13, lineHeight: 1.6, fontFamily: '"Fira Code", "Cascadia Code", monospace' }}>
        <code dangerouslySetInnerHTML={{ __html: html || (code || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }} style={{ color: '#cdd6f4' }} />
      </pre>
    </div>
  )
}
