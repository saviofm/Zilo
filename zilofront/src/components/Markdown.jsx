// src/components/Markdown.jsx
// Markdown renderer for assistant text blocks. Adapted from DemoJouleWork
// with Zilor green accent colors instead of purple.

import ReactMarkdown from 'react-markdown'

const styles = {
  h1:   { fontSize: 20, fontWeight: 600, color: '#111827', margin: '16px 0 10px', letterSpacing: '-0.2px' },
  h2:   { fontSize: 17, fontWeight: 600, color: '#111827', margin: '14px 0 8px',  letterSpacing: '-0.1px' },
  h3:   { fontSize: 15, fontWeight: 600, color: '#111827', margin: '12px 0 6px' },
  h4:   { fontSize: 14, fontWeight: 600, color: '#111827', margin: '10px 0 4px' },
  p:    { margin: '0 0 8px', lineHeight: 1.65 },
  ul:   { margin: '4px 0 10px', paddingLeft: 20 },
  ol:   { margin: '4px 0 10px', paddingLeft: 20 },
  li:   { margin: '2px 0', lineHeight: 1.6 },
  hr:   { border: 'none', borderTop: '1px solid #E5E7EB', margin: '14px 0' },
  blockquote: {
    margin: '8px 0',
    padding: '6px 12px',
    borderLeft: '3px solid #8CC63E',
    background: '#e8f5e9',
    color: '#01502D',
    borderRadius: 4,
  },
  code: {
    background: '#F3F4F6',
    color: '#01502D',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  pre: {
    background: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '12px 14px',
    margin: '8px 0',
    overflowX: 'auto',
    fontSize: 13,
    lineHeight: 1.5,
  },
  a: { color: '#01502D', textDecoration: 'none' },
  strong: { fontWeight: 600, color: '#111827' },
  em: { fontStyle: 'italic' },
}

const components = {
  h1: ({ node, ...p }) => <h1 style={styles.h1} {...p} />,
  h2: ({ node, ...p }) => <h2 style={styles.h2} {...p} />,
  h3: ({ node, ...p }) => <h3 style={styles.h3} {...p} />,
  h4: ({ node, ...p }) => <h4 style={styles.h4} {...p} />,
  p:  ({ node, ...p }) => <p  style={styles.p}  {...p} />,
  ul: ({ node, ...p }) => <ul style={styles.ul} {...p} />,
  ol: ({ node, ...p }) => <ol style={styles.ol} {...p} />,
  li: ({ node, ...p }) => <li style={styles.li} {...p} />,
  hr: ({ node, ...p }) => <hr style={styles.hr} {...p} />,
  blockquote: ({ node, ...p }) => <blockquote style={styles.blockquote} {...p} />,
  a:  ({ node, ...p }) => <a  style={styles.a}  target="_blank" rel="noreferrer" {...p} />,
  strong: ({ node, ...p }) => <strong style={styles.strong} {...p} />,
  em:     ({ node, ...p }) => <em     style={styles.em}     {...p} />,
  code: ({ node, inline, className, children, ...p }) =>
    inline
      ? <code style={styles.code} {...p}>{children}</code>
      : <code style={{ ...styles.code, background: 'transparent', padding: 0, color: '#111827' }} {...p}>{children}</code>,
  pre: ({ node, ...p }) => <pre style={styles.pre} {...p} />,
}

export default function Markdown({ text }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <ReactMarkdown components={components}>{text || ''}</ReactMarkdown>
    </div>
  )
}
