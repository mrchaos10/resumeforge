import { useState } from 'react'

export default function LoginPage({ onLogin }) {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!key.trim()) return
    setStatus('loading')
    setMsg('')
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key.trim() })
      })
      const data = await res.json()
      if (data.valid) {
        setStatus('success')
        setMsg('API key validated! Entering ResumeForge...')
        setTimeout(() => onLogin(key.trim()), 900)
      } else {
        setStatus('error')
        setMsg(data.message || 'Invalid API key. Please check and try again.')
      }
    } catch (err) {
      setStatus('error')
      setMsg('Could not reach server. Is the backend running?')
    }
  }

  return (
    <div style={styles.wrap}>
      {/* Background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card} className="fade-in">
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📄</span>
          <div>
            <div style={styles.logoTitle}>ResumeForge</div>
            <div style={styles.logoSub}>AI-Powered Resume Tailor</div>
          </div>
        </div>

        <div style={styles.divider} />

        <h2 style={styles.heading}>Enter your Gemini API Key</h2>
        <p style={styles.subheading}>
          Your key is validated live and <strong>never stored</strong> on our servers.
          Get one free at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={styles.link}>
            Google AI Studio
          </a>
          .
        </p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputWrap}>
            <input
              type={show ? 'text' : 'password'}
              placeholder="AIza..."
              value={key}
              onChange={e => setKey(e.target.value)}
              style={{
                ...styles.input,
                borderColor: status === 'error' ? 'var(--danger)' : status === 'success' ? 'var(--success)' : 'var(--border)'
              }}
              autoFocus
              spellCheck={false}
            />
            <button type="button" onClick={() => setShow(s => !s)} style={styles.eyeBtn}>
              {show ? '🙈' : '👁️'}
            </button>
          </div>

          {msg && (
            <div style={{
              ...styles.msgBox,
              background: status === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
              borderColor: status === 'error' ? 'var(--danger)' : 'var(--success)',
              color: status === 'error' ? 'var(--danger)' : 'var(--success)'
            }}>
              {status === 'error' ? '✗ ' : '✓ '}{msg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'loading' || status === 'success' || !key.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
          >
            {status === 'loading' ? (
              <><span className="spinner" /> Validating...</>
            ) : status === 'success' ? (
              '✓ Validated!'
            ) : (
              '→ Enter ResumeForge'
            )}
          </button>
        </form>

        <div style={styles.features}>
          {['🔍 Job URL parsing', '🤖 Gemma 4 AI tailoring', '📝 Live LaTeX editor', '📥 Auto-named PDF export'].map(f => (
            <div key={f} style={styles.featureTag}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', padding: '20px'
  },
  blob1: {
    position: 'fixed', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
    top: -100, left: -100, pointerEvents: 'none'
  },
  blob2: {
    position: 'fixed', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
    bottom: -100, right: -100, pointerEvents: 'none'
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '40px', width: '100%', maxWidth: 480,
    position: 'relative', zIndex: 1, boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
  },
  logo: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  logoIcon: { fontSize: 42 },
  logoTitle: { fontSize: 22, fontWeight: 700, color: 'var(--text)' },
  logoSub: { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  divider: { height: 1, background: 'var(--border)', marginBottom: 24 },
  heading: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  subheading: { fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 },
  link: { color: 'var(--accent2)', textDecoration: 'none' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', padding: '12px 44px 12px 14px',
    background: 'var(--surface2)', border: '1.5px solid',
    borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14,
    fontFamily: 'var(--mono)', transition: 'border-color 0.2s'
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4
  },
  msgBox: {
    padding: '10px 14px', borderRadius: 8, border: '1px solid',
    fontSize: 13, fontWeight: 500
  },
  features: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  featureTag: {
    fontSize: 11, padding: '4px 10px', borderRadius: 20,
    background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)'
  }
}
