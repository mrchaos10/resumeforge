export default function PreviewPanel({ pdfUrl, onCompile, compiling }) {
  if (!pdfUrl) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📄</div>
        <div style={styles.emptyTitle}>No PDF compiled yet</div>
        <div style={styles.emptySubtitle}>
          Edit your LaTeX in the editor, then click "Compile PDF" to preview it here.
        </div>
        <button
          className="btn-primary"
          onClick={onCompile}
          disabled={compiling}
          style={{ marginTop: 20 }}
        >
          {compiling ? <><span className="spinner" /> Compiling...</> : '⚙ Compile PDF Now'}
        </button>
      </div>
    )
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.toolbar}>
        <span style={styles.label}>📄 resume.pdf</span>
        <div style={styles.toolbarRight}>
          <a href={pdfUrl} target="_blank" rel="noreferrer" style={styles.openBtn}>
            ↗ Open in new tab
          </a>
          <button
            className="btn-secondary"
            onClick={onCompile}
            disabled={compiling}
            style={{ fontSize: 12, padding: '5px 12px' }}
          >
            {compiling ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Recompiling...</> : '↺ Recompile'}
          </button>
        </div>
      </div>
      <iframe
        src={pdfUrl}
        style={styles.iframe}
        title="PDF Preview"
      />
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%' },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', background: 'var(--surface2)',
    borderBottom: '1px solid var(--border)', flexShrink: 0
  },
  label: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: 10 },
  openBtn: {
    fontSize: 12, color: 'var(--accent2)', textDecoration: 'none',
    padding: '5px 10px', borderRadius: 6,
    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)'
  },
  iframe: { flex: 1, border: 'none', background: '#fff' },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 40, textAlign: 'center'
  },
  emptyIcon: { fontSize: 56, marginBottom: 16, opacity: 0.4 },
  emptyTitle: { fontSize: 16, fontWeight: 600, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: 'var(--muted)', maxWidth: 320, lineHeight: 1.6 }
}
