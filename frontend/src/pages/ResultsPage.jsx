import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  EmojiEvents as TrophyIcon,
  HowToVote as VoteIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material'
import api from '../services/api'

// ─── tiny chart helpers (no extra deps) ──────────────────────────────────────

const PALETTE = [
  '#4A148C', '#7B1FA2', '#AB47BC', '#CE93D8',
  '#1565C0', '#0288D1', '#00838F', '#2E7D32',
]

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.votes), 1)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {data.map((d, i) => (
        <Box key={d.candidateId}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.85rem' }}>
              {d.name}
            </Typography>
            <Typography variant="body2" sx={{ color: PALETTE[i % PALETTE.length], fontWeight: 700 }}>
              {d.votes} vote{d.votes !== 1 ? 's' : ''} ({d.pct}%)
            </Typography>
          </Box>
          <Box sx={{ position: 'relative', height: 28, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(d.votes / max) * 100}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
                borderRadius: 2,
                transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                minWidth: d.votes > 0 ? 4 : 0,
              }}
            />
            {d.isWinner && (
              <Box sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                <TrophyIcon sx={{ fontSize: 16, color: '#f9a825' }} />
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

function DonutChart({ data, total }) {
  const size = 200
  const strokeWidth = 32
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  const slices = data.map((d, i) => {
    const pct = total > 0 ? d.votes / total : 0
    const dash = pct * circumference
    const slice = { ...d, dash, gap: circumference - dash, offset, color: PALETTE[i % PALETTE.length] }
    offset += dash
    return slice
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth} />
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <Box sx={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{total}</Typography>
          <Typography variant="caption" sx={{ color: '#616161' }}>total votes</Typography>
        </Box>
      </Box>
      {/* legend */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%' }}>
        {data.map((d, i) => (
          <Box key={d.candidateId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: '#1a1a1a', flex: 1 }}>{d.name}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>{d.pct}%</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function VoteTimeline({ votes }) {
  if (!votes || votes.length === 0) return (
    <Typography variant="body2" sx={{ color: '#9e9e9e', textAlign: 'center', py: 2 }}>
      No timeline data available.
    </Typography>
  )

  // Group by hour
  const buckets = {}
  votes.forEach(v => {
    const d = new Date(v.castAt)
    const key = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:00`
    buckets[key] = (buckets[key] || 0) + 1
  })
  const timeline = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b))
  const maxCount = Math.max(...timeline.map(([, c]) => c), 1)

  return (
    <Box>
      <Typography variant="body2" sx={{ color: '#616161', mb: 2, fontStyle: 'italic' }}>
        Vote activity by hour
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 80, overflowX: 'auto', pb: 1 }}>
        {timeline.map(([label, count]) => (
          <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#9e9e9e', mb: 0.5 }}>{count}</Typography>
            <Box sx={{
              width: 32, backgroundColor: '#4A148C', borderRadius: '4px 4px 0 0',
              height: `${(count / maxCount) * 60}px`,
              minHeight: 4,
              transition: 'height 0.5s ease',
            }} />
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: '#9e9e9e', mt: 0.5, textAlign: 'center', lineHeight: 1.2 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent = '#4A148C' }) {
  return (
    <Box sx={{
      p: 2.5, borderRadius: 2, border: '1px solid #e0e0e0',
      backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 2,
    }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: 2,
        backgroundColor: accent, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#fff', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: '#616161' }}>{label}</Typography>
      </Box>
    </Box>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const { electionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    if (electionId) fetchResults()
  }, [electionId])

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError('')
      // Use the enhanced endpoint that returns candidate names + vote timeline
      const res = await api.get(`/api/admin/results/${electionId}`)
      setResults(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load results.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
      <CircularProgress sx={{ color: '#4A148C' }} />
      <Typography sx={{ color: '#616161' }}>Loading election results…</Typography>
    </Box>
  )

  if (error) return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin')}>Back to Dashboard</Button>
    </Container>
  )

  if (!results) return null

  const { title, status, totalVotes, results: contestResults = [], votes = [], startDate, endDate } = results

  // Build chart data per contest
  const contestCharts = contestResults.map(contest => {
    const total = contest.candidates.reduce((s, c) => s + c.votes, 0)
    const sorted = [...contest.candidates].sort((a, b) => b.votes - a.votes)
    const winner = sorted[0]
    const chartData = sorted.map(c => ({
      ...c,
      pct: total > 0 ? Math.round((c.votes / total) * 100) : 0,
      isWinner: c.candidateId === winner?.candidateId && winner?.votes > 0,
    }))
    return { ...contest, chartData, winner: winner?.votes > 0 ? winner : null, total }
  })

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

  const uniqueVoters = votes.length
  const turnoutPct = results.registeredVoters > 0
    ? Math.round((uniqueVoters / results.registeredVoters) * 100)
    : null

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', pb: 6 }}>

      {/* ── Header ── */}
      <Box sx={{ backgroundColor: '#4A148C', py: 4, px: 3, mb: 4 }}>
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin')}
            sx={{
              color: 'rgba(255,255,255,0.75)',
              mb: 3,
              textTransform: 'none',
              fontSize: '0.85rem',
              '&:hover': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
            }}
          >
            Back to Dashboard
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              {/* Label */}
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  mb: 0.75,
                }}
              >
                Election Results
              </Typography>

              {/* Title */}
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: '#ffffff', mb: 1.5, lineHeight: 1.2 }}
              >
                {title}
              </Typography>

              {/* Date range pill */}
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <TimeIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', fontWeight: 500 }}>
                  {formatDate(startDate)} → {formatDate(endDate)}
                </Typography>
              </Box>
            </Box>

            <Chip
              label={status?.toUpperCase() || 'UNKNOWN'}
              sx={{
                backgroundColor: status === 'open' ? '#a5d6a7' : status === 'closed' ? '#ef9a9a' : '#fff9c4',
                color: '#1a1a1a', fontWeight: 700, fontSize: '0.75rem',
                alignSelf: 'flex-start',
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">

        {/* ── Summary Stats ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2, mb: 4 }}>
          <StatCard icon={<VoteIcon />} label="Total Votes Cast" value={totalVotes} />
          <StatCard icon={<PeopleIcon />} label="Unique Voters" value={uniqueVoters} accent="#1565C0" />
          <StatCard icon={<TrophyIcon />} label="Contests" value={contestResults.length} accent="#2E7D32" />
          {turnoutPct !== null && (
            <StatCard icon={<TimeIcon />} label="Estimated Turnout" value={`${turnoutPct}%`} accent="#E65100" />
          )}
        </Box>

        {/* ── Winners Banner ── */}
        {contestCharts.some(c => c.winner) && (
          <Box sx={{ mb: 4, p: 3, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <TrophyIcon sx={{ color: '#f9a825', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#4A148C' }}>
                Election Winners
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {contestCharts.filter(c => c.winner).map(c => (
                <Box
                  key={c.contestId}
                  sx={{
                    flex: '1 1 220px',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid #4A148C',
                    boxShadow: '0 4px 16px rgba(74,20,140,0.15)',
                  }}
                >
                  {/* Gold top bar */}
                  <Box sx={{ height: 6, background: 'linear-gradient(90deg, #f9a825, #fdd835)' }} />

                  {/* Content */}
                  <Box sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #4A148C 0%, #6a1b9a 100%)',
                  }}>
                    {/* Contest label */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255,255,255,0.75)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontSize: '0.65rem',
                        display: 'block',
                        mb: 0.75,
                      }}
                    >
                      {c.contestTitle}
                    </Typography>

                    {/* Trophy + name row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TrophyIcon sx={{ color: '#fdd835', fontSize: 20, flexShrink: 0 }} />
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 700,
                          color: '#ffffff',
                          lineHeight: 1.2,
                        }}
                      >
                        {c.winner.name}
                      </Typography>
                    </Box>

                    {/* Vote count */}
                    <Typography
                      variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}
                    >
                      {c.winner.votes} vote{c.winner.votes !== 1 ? 's' : ''}
                      {c.total > 0 ? (
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {Math.round((c.winner.votes / c.total) * 100)}%
                        </Box>
                      ) : null}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* ── Per-Contest Results ── */}
        {contestCharts.map((contest, idx) => (
          <Box key={contest.contestId || idx} sx={{ mb: 4, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            {/* Contest header */}
            <Box sx={{ p: 2.5, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a' }}>{contest.contestTitle}</Typography>
                <Typography variant="caption" sx={{ color: '#616161', textTransform: 'capitalize' }}>
                  {contest.ruleType} choice · {contest.total} vote{contest.total !== 1 ? 's' : ''}
                </Typography>
              </Box>
              {contest.winner && (
                <Chip
                  icon={<TrophyIcon sx={{ fontSize: '14px !important', color: '#f9a825 !important' }} />}
                  label={`Winner: ${contest.winner.name}`}
                  sx={{ backgroundColor: '#fff8e1', color: '#e65100', fontWeight: 600, fontSize: '0.75rem' }}
                />
              )}
            </Box>

            {/* Charts */}
            <Box sx={{ p: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px' }, gap: 4 }}>
              {/* Bar chart */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#616161', mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
                  Vote Distribution
                </Typography>
                {contest.chartData.length > 0 ? (
                  <BarChart data={contest.chartData} />
                ) : (
                  <Typography variant="body2" sx={{ color: '#9e9e9e', fontStyle: 'italic' }}>No votes recorded yet.</Typography>
                )}
              </Box>

              {/* Donut chart */}
              {contest.total > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#616161', mb: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' }}>
                    Share
                  </Typography>
                  <DonutChart data={contest.chartData} total={contest.total} />
                </Box>
              )}
            </Box>

            {/* Results table */}
            <Box sx={{ borderTop: '1px solid #f0f0f0', overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr" sx={{ backgroundColor: '#fafafa' }}>
                    {['Rank', 'Candidate', 'Votes', 'Percentage', 'Status'].map(h => (
                      <Box component="th" key={h} sx={{ p: 1.5, textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#616161', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {contest.chartData.map((c, i) => (
                    <Box component="tr" key={c.candidateId} sx={{ borderTop: '1px solid #f5f5f5', '&:hover': { backgroundColor: '#fafafa' } }}>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: i === 0 && c.votes > 0 ? '#4A148C' : '#616161' }}>
                          #{i + 1}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>{c.name}</Typography>
                        {c.description && (
                          <Typography variant="caption" sx={{ color: '#9e9e9e' }}>{c.description}</Typography>
                        )}
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a' }}>{c.votes}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        <Typography variant="body2" sx={{ color: PALETTE[i % PALETTE.length], fontWeight: 600 }}>{c.pct}%</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1.5 }}>
                        {c.isWinner && c.votes > 0 ? (
                          <Chip label="Winner" size="small" icon={<TrophyIcon sx={{ fontSize: '12px !important', color: '#e65100 !important' }} />}
                            sx={{ backgroundColor: '#fff8e1', color: '#e65100', fontWeight: 600, fontSize: '0.7rem' }} />
                        ) : (
                          <Chip label={i === 0 && contest.total === 0 ? '—' : 'Runner-up'} size="small"
                            sx={{ backgroundColor: '#f5f5f5', color: '#9e9e9e', fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        ))}

        {/* ── Vote Timeline ── */}
        {votes.length > 0 && (
          <Box sx={{ backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
              Voting Activity Timeline
            </Typography>
            <VoteTimeline votes={votes} />
          </Box>
        )}

        {/* ── Empty state ── */}
        {totalVotes === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: '#9e9e9e' }}>
            <VoteIcon sx={{ fontSize: 56, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6">No votes recorded yet.</Typography>
            <Typography variant="body2">Results will appear here once voting begins.</Typography>
          </Box>
        )}

        {/* ── Blockchain info ── */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#43a047', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#616161' }}>
            All votes are cryptographically secured on the Hyperledger Fabric blockchain.
            Results are tallied directly from on-chain data using anonymous voter hashes — individual voter identities cannot be traced.
          </Typography>
        </Box>

      </Container>
    </Box>
  )
}
