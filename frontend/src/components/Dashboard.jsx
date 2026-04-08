import { useState } from 'react'
import JobPanel from './JobPanel.jsx'
import EditorPanel from './EditorPanel.jsx'
import PreviewPanel from './PreviewPanel.jsx'

const BASE_LATEX = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{parskip}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\setlist[itemize]{leftmargin=*, noitemsep, topsep=4pt}

\\begin{document}

\\begin{center}
  {\\LARGE \\textbf{Your Name}}\\\\[4pt]
  your@email.com $\\cdot$ +1 (555) 000-0000 $\\cdot$ linkedin.com/in/yourname $\\cdot$ github.com/yourname
\\end{center}

\\section{Summary}
Results-driven software engineer with 3+ years of experience building scalable web applications.
Passionate about clean code, developer experience, and solving real-world problems.

\\section{Experience}
\\textbf{Software Engineer} \\hfill Jan 2022 -- Present\\\\
\\textit{Acme Corporation, San Francisco, CA}
\\begin{itemize}
  \\item Built and maintained RESTful APIs serving 500K+ daily active users
  \\item Reduced page load time by 40\\% through caching and code splitting
  \\item Led migration from monolith to microservices, improving deployment frequency by 3x
\\end{itemize}

\\textbf{Junior Developer} \\hfill Jun 2020 -- Dec 2021\\\\
\\textit{Startup Inc., Remote}
\\begin{itemize}
  \\item Developed React dashboards consuming GraphQL APIs
  \\item Wrote unit and integration tests, maintaining 85\\% code coverage
\\end{itemize}

\\section{Education}
\\textbf{B.S. Computer Science} \\hfill May 2020\\\\
\\textit{State University}

\\section{Skills}
\\textbf{Languages:} Python, JavaScript, TypeScript, Java\\\\
\\textbf{Frameworks:} React, Node.js, FastAPI, Spring Boot\\\\
\\textbf{Tools:} Docker, Kubernetes, AWS, PostgreSQL, Redis, Git

\\end{document}`

export default function Dashboard({ apiKey, onLogout }) {
  const [latex, setLatex] = useState(BASE_LATEX)
  const [jobInfo, setJobInfo] = useState(null)
  const [tailoring, setTailoring] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [activePanel, setActivePanel] = useState('editor') // editor | preview
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleTailor(info) {
    setTailoring(true)
    setJobInfo(info)
    try {
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex_content: latex, job_info: info, api_key: apiKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Tailoring failed')
      setLatex(data.tailored_latex)
      showToast('✓ Resume tailored to job! Review the editor.', 'success')
    } catch (err) {
      showToast('✗ ' + err.message, 'error')
    } finally {
      setTailoring(false)
    }
  }

  function buildFilename() {
    const date = new Date().toISOString().split('T')[0]
    const company = (jobInfo?.company || 'company').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    const job = (jobInfo?.job_title || 'resume').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `yourname_resume_${job}_${company}_${date}`
  }

  async function handleCompile() {
    setCompiling(true)
    setPdfUrl(null)
    try {
      const filename = buildFilename()
      const res = await fetch('/api/compile-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex_content: latex, filename })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Compilation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setActivePanel('preview')
      showToast('✓ PDF compiled successfully!', 'success')
    } catch (err) {
      showToast('✗ ' + err.message, 'error')
    } finally {
      setCompiling(false)
    }
  }

  function handleDownload() {
    if (!pdfUrl) return
    const filename = buildFilename() + '.pdf'
    const a = document.createElement('a')
    a.href = pdfUrl
    a.download = filename
    a.click()
    showToast(`✓ Downloaded as ${filename}`, 'success')
  }

  return (
    <div style={styles.root}>
      {/* Top Bar */}
      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <span style={{ fontSize: 22 }}>📄</span>
          <span style={styles.brand}>ResumeForge</span>
          {jobInfo && (
            <span className="tag tag-purple" style={{ marginLeft: 8 }}>
              {jobInfo.job_title} @ {jobInfo.company}
            </span>
          )}
        </div>
        <div style={styles.topRight}>
          <button
            className="btn-secondary"
            onClick={handleCompile}
            disabled={compiling || tailoring}
            style={{ fontSize: 13 }}
          >
            {compiling ? <><span className="spinner" /> Compiling...</> : '⚙ Compile PDF'}
          </button>
          {pdfUrl && (
            <button className="btn-primary" onClick={handleDownload} style={{ fontSize: 13 }}>
              ↓ Download PDF
            </button>
          )}
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          background: toast.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
          borderColor: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: toast.type === 'error' ? 'var(--danger)' : 'var(--success)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Main Layout */}
      <div style={styles.main}>
        {/* Left: Job Panel */}
        <div style={styles.leftCol}>
          <JobPanel apiKey={apiKey} onTailor={handleTailor} tailoring={tailoring} />
        </div>

        {/* Right: Editor + Preview */}
        <div style={styles.rightCol}>
          {/* Tab switcher */}
          <div style={styles.tabs}>
            <button
              onClick={() => setActivePanel('editor')}
              style={{ ...styles.tab, ...(activePanel === 'editor' ? styles.tabActive : {}) }}
            >
              ✏ LaTeX Editor
            </button>
            <button
              onClick={() => setActivePanel('preview')}
              style={{ ...styles.tab, ...(activePanel === 'preview' ? styles.tabActive : {}) }}
            >
              👁 PDF Preview {pdfUrl ? '●' : ''}
            </button>
          </div>

          <div style={styles.panelContent}>
            {activePanel === 'editor' ? (
              <EditorPanel latex={latex} onChange={setLatex} tailoring={tailoring} />
            ) : (
              <PreviewPanel pdfUrl={pdfUrl} onCompile={handleCompile} compiling={compiling} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', height: 56, background: 'var(--surface)',
    borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12
  },
  topLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  topRight: { display: 'flex', alignItems: 'center', gap: 10 },
  brand: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  logoutBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
    padding: '6px 14px', borderRadius: 8, fontSize: 13
  },
  toast: {
    position: 'fixed', top: 64, right: 20, zIndex: 999,
    padding: '10px 16px', borderRadius: 8, border: '1px solid',
    fontSize: 13, fontWeight: 500, maxWidth: 380,
    animation: 'fadeIn 0.3s ease'
  },
  main: { display: 'flex', flex: 1, overflow: 'hidden' },
  leftCol: { width: 360, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  rightCol: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs: { display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  tab: {
    padding: '12px 20px', background: 'none', color: 'var(--muted)',
    fontSize: 13, fontWeight: 500, border: 'none', borderBottom: '2px solid transparent'
  },
  tabActive: { color: 'var(--accent2)', borderBottomColor: 'var(--accent)' },
  panelContent: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
}
