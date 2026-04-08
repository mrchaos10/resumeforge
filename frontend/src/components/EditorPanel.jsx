import { useEffect, useRef } from 'react'

export default function EditorPanel({ latex, onChange, tailoring }) {
  const textareaRef = useRef(null)

  // Simple line counter
  const lines = latex.split('\n').length

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.target
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newVal = latex.substring(0, start) + '  ' + latex.substring(end)
      onChange(newVal)
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div style={styles.wrap}>
      {/* Editor toolbar */}
      <div style={styles.toolbar}>
        <span style={styles.toolbarLabel}>📄 resume.tex</span>
        <div style={styles.toolbarRight}>
          {tailoring && (
            <span style={styles.tailoringBadge}>
              <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              AI tailoring...
            </span>
          )}
          <span style={styles.lineCount}>{lines} lines</span>
          <SnippetButtons onInsert={(snippet) => {
            const ta = textareaRef.current
            if (!ta) return
            const start = ta.selectionStart
            const newVal = latex.substring(0, start) + snippet + latex.substring(start)
            onChange(newVal)
            setTimeout(() => {
              ta.selectionStart = ta.selectionEnd = start + snippet.length
              ta.focus()
            }, 0)
          }} />
        </div>
      </div>

      {/* Main editor area with line numbers */}
      <div style={styles.editorWrap}>
        <div style={styles.lineNums} aria-hidden="true">
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} style={styles.lineNum}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={latex}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          style={styles.textarea}
          disabled={tailoring}
        />
      </div>
    </div>
  )
}

function SnippetButtons({ onInsert }) {
  const snippets = [
    { label: '\\section', val: '\\section{}\n' },
    { label: '\\item', val: '\\item ' },
    { label: 'itemize', val: '\\begin{itemize}\n  \\item \n\\end{itemize}\n' },
    { label: 'bold', val: '\\textbf{}' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {snippets.map(s => (
        <button
          key={s.label}
          onClick={() => onInsert(s.val)}
          style={snippetBtnStyle}
          title={`Insert ${s.label}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

const snippetBtnStyle = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  color: 'var(--muted)', padding: '3px 8px', borderRadius: 4,
  fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer'
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: 'var(--surface2)',
    borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 8, flexWrap: 'wrap'
  },
  toolbarLabel: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tailoringBadge: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: 'var(--accent2)',
    background: 'rgba(108,99,255,0.1)', padding: '4px 10px', borderRadius: 20,
    border: '1px solid rgba(108,99,255,0.3)'
  },
  lineCount: { fontSize: 11, color: 'var(--muted)' },
  editorWrap: { display: 'flex', flex: 1, overflow: 'hidden' },
  lineNums: {
    background: 'var(--surface2)', padding: '12px 0',
    minWidth: 44, textAlign: 'right', userSelect: 'none',
    borderRight: '1px solid var(--border)', overflowY: 'hidden', flexShrink: 0
  },
  lineNum: { fontSize: 12, lineHeight: '21px', color: 'var(--border)', paddingRight: 10 },
  textarea: {
    flex: 1, background: 'var(--bg)', color: 'var(--text)',
    border: 'none', outline: 'none', resize: 'none',
    fontFamily: 'var(--mono)', fontSize: 13, lineHeight: '21px',
    padding: '12px 14px', overflowY: 'auto', tabSize: 2
  }
}
