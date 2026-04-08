import { useState } from 'react'

export default function JobPanel({ apiKey, onTailor, tailoring }) {
  const [url, setUrl] = useState('')
  const [rawText, setRawText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jobInfo, setJobInfo] = useState(null)
  const [error, setError] = useState('')

  async function handleScrape(e) {
    e.preventDefault()
    if (!url.trim() && !rawText.trim()) return
    setLoading(true)
    setError('')
    setJobInfo(null)
    try {
      const res = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || 'https://example.com',
          api_key: apiKey,
          raw_text: rawText.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) {
        // If LinkedIn blocked, show the paste box automatically
        if (res.status === 403 || data.detail?.toLowerCase().includes('linkedin')) {
          setShowPaste(true)
        }
        throw new Error(data.detail || 'Failed to analyze job')
      }
      setJobInfo(data.job_info)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isLinkedIn = url.toLowerCase().includes('linkedin.com')
  const sponsorshipColor =
    jobInfo?.sponsorship === 'Yes' ? 'tag-green' :
    jobInfo?.sponsorship === 'No' ? 'tag-red' : 'tag-yellow'

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={styles.title}>Job Analyzer</span>
      </div>

      <form onSubmit={handleScrape} style={styles.form}>
        {/* URL input */}
        <textarea
          value={url}
          onChange={e => { setUrl(e.target.value); if (e.target.value.includes('linkedin')) setShowPaste(true) }}
          placeholder="Paste job URL (LinkedIn, Greenhouse, Lever, Workday...)"
          style={styles.urlInput}
          rows={2}
        />

        {/* LinkedIn tip */}
        {isLinkedIn && (
          <div style={styles.tipBox}>
            💡 <strong>LinkedIn tip:</strong> LinkedIn blocks automated scraping.
            If it fails, paste the job description text below instead.
            <button type="button" onClick={() => setShowPaste(s => !s)} style={styles.toggleBtn}>
              {showPaste ? 'Hide text box' : 'Show text box'}
            </button>
          </div>
        )}

        {/* Paste fallback */}
        {showPaste && (
          <div>
            <div style={styles.pasteLabel}>
              Or paste job description text directly:
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Copy the full job description from LinkedIn and paste it here..."
              style={{ ...styles.urlInput, minHeight: 120 }}
              rows={6}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || (!url.trim() && !rawText.trim())}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? <><span className="spinner" /> Analyzing...</> : '⚡ Analyze Job Posting'}
        </button>

        {/* Manual paste toggle for non-LinkedIn */}
        {!isLinkedIn && (
          <button type="button" onClick={() => setShowPaste(s => !s)} style={styles.smallLink}>
            {showPaste ? '▲ Hide' : '▼ Or paste job text manually'}
          </button>
        )}
      </form>

      {error && (
        <div style={styles.errorBox}>
          <div>✗ {error}</div>
          {!showPaste && (
            <button type="button" onClick={() => setShowPaste(true)} style={styles.toggleBtn}>
              Try pasting job text instead →
            </button>
          )}
        </div>
      )}

      {jobInfo && (
        <div style={styles.infoWrap} className="fade-in">
          <div style={styles.jobHeader}>
            <div style={styles.jobTitle}>{jobInfo.job_title}</div>
            <div style={styles.jobMeta}>
              {jobInfo.company && <span style={styles.metaItem}>🏢 {jobInfo.company}</span>}
              {jobInfo.location && <span style={styles.metaItem}>📍 {jobInfo.location}</span>}
              {jobInfo.employment_type && <span style={styles.metaItem}>⏰ {jobInfo.employment_type}</span>}
              {jobInfo.salary_range && jobInfo.salary_range !== 'Not mentioned' && (
                <span style={styles.metaItem}>💰 {jobInfo.salary_range}</span>
              )}
            </div>
          </div>

          <div style={styles.sponsorRow}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Visa Sponsorship:</span>
            <span className={`tag ${sponsorshipColor}`}>{jobInfo.sponsorship}</span>
          </div>
          {jobInfo.sponsorship_details && jobInfo.sponsorship_details !== 'N/A' && (
            <div style={styles.sponsorDetail}>{jobInfo.sponsorship_details}</div>
          )}

          {jobInfo.summary && (
            <Section title="📋 Summary">
              <p style={styles.summaryText}>{jobInfo.summary}</p>
            </Section>
          )}

          {jobInfo.basic_qualifications?.length > 0 && (
            <Section title="✅ Basic Qualifications">
              <List items={jobInfo.basic_qualifications} color="var(--success)" />
            </Section>
          )}

          {jobInfo.preferred_qualifications?.length > 0 && (
            <Section title="⭐ Preferred Qualifications">
              <List items={jobInfo.preferred_qualifications} color="var(--warning)" />
            </Section>
          )}

          {jobInfo.key_skills?.length > 0 && (
            <Section title="🛠 Key Skills">
              <div style={styles.skillsWrap}>
                {jobInfo.key_skills.map((s, i) => (
                  <span key={i} className="tag tag-purple">{s}</span>
                ))}
              </div>
            </Section>
          )}

          <button
            className="btn-primary"
            onClick={() => onTailor(jobInfo)}
            disabled={tailoring}
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {tailoring
              ? <><span className="spinner" /> Tailoring resume...</>
              : '🤖 Tailor My Resume to This Job'}
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function List({ items, color }) {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: 12, color: 'var(--text)', display: 'flex', gap: 6, lineHeight: 1.5 }}>
          <span style={{ color, flexShrink: 0 }}>▸</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  title: { fontSize: 14, fontWeight: 600 },
  form: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, borderBottom: '1px solid var(--border)' },
  urlInput: { background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5, width: '100%' },
  tipBox: { background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--warning)', lineHeight: 1.6 },
  pasteLabel: { fontSize: 11, color: 'var(--muted)', marginBottom: 6 },
  toggleBtn: { background: 'none', border: 'none', color: 'var(--accent2)', fontSize: 11, cursor: 'pointer', padding: '4px 0', display: 'block', marginTop: 4 },
  smallLink: { background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', textAlign: 'left' },
  errorBox: { margin: '0 16px', padding: '10px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 12 },
  infoWrap: { flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 },
  jobHeader: { paddingBottom: 10, borderBottom: '1px solid var(--border)' },
  jobTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  jobMeta: { display: 'flex', flexDirection: 'column', gap: 3 },
  metaItem: { fontSize: 12, color: 'var(--muted)' },
  sponsorRow: { display: 'flex', alignItems: 'center', gap: 8 },
  sponsorDetail: { fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginTop: -6 },
  summaryText: { fontSize: 12, color: 'var(--text)', lineHeight: 1.6 },
  skillsWrap: { display: 'flex', flexWrap: 'wrap', gap: 5 }
}
