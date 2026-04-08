import { useState } from 'react'

export default function JobPanel({ apiKey, onTailor, tailoring }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [jobInfo, setJobInfo] = useState(null)
  const [error, setError] = useState('')

  async function handleScrape(e) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    setJobInfo(null)
    try {
      const res = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), api_key: apiKey })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Scraping failed')
      setJobInfo(data.job_info)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
        <textarea
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste LinkedIn, Greenhouse, Lever, or any job posting URL..."
          style={styles.urlInput}
          rows={3}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !url.trim()}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? <><span className="spinner" /> Analyzing job...</> : '⚡ Analyze Job Posting'}
        </button>
      </form>

      {error && (
        <div style={styles.errorBox}>✗ {error}</div>
      )}

      {jobInfo && (
        <div style={styles.infoWrap} className="fade-in">
          {/* Header info */}
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

          {/* Sponsorship badge */}
          <div style={styles.sponsorRow}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Visa Sponsorship:</span>
            <span className={`tag ${sponsorshipColor}`}>{jobInfo.sponsorship}</span>
          </div>
          {jobInfo.sponsorship_details && jobInfo.sponsorship_details !== 'N/A' && (
            <div style={styles.sponsorDetail}>{jobInfo.sponsorship_details}</div>
          )}

          {/* Summary */}
          {jobInfo.summary && (
            <Section title="📋 Summary">
              <p style={styles.summaryText}>{jobInfo.summary}</p>
            </Section>
          )}

          {/* Basic qualifications */}
          {jobInfo.basic_qualifications?.length > 0 && (
            <Section title="✅ Basic Qualifications">
              <List items={jobInfo.basic_qualifications} color="var(--success)" />
            </Section>
          )}

          {/* Preferred qualifications */}
          {jobInfo.preferred_qualifications?.length > 0 && (
            <Section title="⭐ Preferred Qualifications">
              <List items={jobInfo.preferred_qualifications} color="var(--warning)" />
            </Section>
          )}

          {/* Key skills */}
          {jobInfo.key_skills?.length > 0 && (
            <Section title="🛠 Key Skills">
              <div style={styles.skillsWrap}>
                {jobInfo.key_skills.map((s, i) => (
                  <span key={i} className="tag tag-purple">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Tailor button */}
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
  header: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px',
    borderBottom: '1px solid var(--border)', flexShrink: 0
  },
  title: { fontSize: 14, fontWeight: 600 },
  form: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, borderBottom: '1px solid var(--border)' },
  urlInput: {
    background: 'var(--surface2)', border: '1.5px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '10px 12px',
    resize: 'none', lineHeight: 1.5, width: '100%'
  },
  errorBox: {
    margin: '0 16px', padding: '10px 12px', borderRadius: 8,
    background: 'rgba(248,113,113,0.1)', border: '1px solid var(--danger)',
    color: 'var(--danger)', fontSize: 12
  },
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
