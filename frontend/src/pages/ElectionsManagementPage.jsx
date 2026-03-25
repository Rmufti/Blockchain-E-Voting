import { useState, useEffect } from 'react'
import {
  Container,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const KNOWN_FACULTIES = [
  'SCIENCE',
  'ARTS',
  'ENGINEERING',
  'BUSINESS',
  'LAW',
  'MEDICINE',
  'EDUCATION',
  'SOCIAL_SCIENCE',
]

const emptyContest = () => ({
  title: '',
  instructionText: '',
  ruleType: 'single',
  required: true,
  maxSelections: '',
  restrictionFaculty: '',
  candidates: [{ name: '', description: '' }],
})

const emptyElection = () => ({
  title: '',
  electionType: 'presidential',
  startDate: '',
  endDate: '',
  restrictedToFaculty: '',
  contests: [emptyContest()],
})

export default function ElectionsManagementPage() {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyElection())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  useEffect(() => {
    fetchElections()
  }, [])

  const fetchElections = async () => {
    try {
      setLoading(true)
      setError('')
      // Try real API first
      const response = await apiService.getAdminElections?.()
      if (response?.data?.elections) {
        setElections(response.data.elections)
      } else {
        // Fallback mock
        setElections([
          {
            ballotId: 'ballot-2026-001',
            title: 'USC Election 2026',
            electionType: 'presidential',
            startDate: '2026-01-01T06:00:00Z',
            endDate: '2026-02-15T06:00:00Z',
            status: 'open',
            blockchainInitialized: true,
          },
        ])
      }
    } catch (err) {
      // Fallback to mock on error
      setElections([
        {
          ballotId: 'ballot-2026-001',
          title: 'USC Election 2026',
          electionType: 'presidential',
          startDate: '2026-01-01T06:00:00Z',
          endDate: '2026-02-15T06:00:00Z',
          status: 'open',
          blockchainInitialized: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = (field, value) =>
    setForm((f) => ({ ...f, [field]: value }))

  const setContest = (ci, field, value) =>
    setForm((f) => {
      const contests = [...f.contests]
      contests[ci] = { ...contests[ci], [field]: value }
      return { ...f, contests }
    })

  const addContest = () =>
    setForm((f) => ({ ...f, contests: [...f.contests, emptyContest()] }))

  const removeContest = (ci) =>
    setForm((f) => ({ ...f, contests: f.contests.filter((_, i) => i !== ci) }))

  const setCandidate = (ci, ki, field, value) =>
    setForm((f) => {
      const contests = [...f.contests]
      const candidates = [...contests[ci].candidates]
      candidates[ki] = { ...candidates[ki], [field]: value }
      contests[ci] = { ...contests[ci], candidates }
      return { ...f, contests }
    })

  const addCandidate = (ci) =>
    setForm((f) => {
      const contests = [...f.contests]
      contests[ci] = {
        ...contests[ci],
        candidates: [...contests[ci].candidates, { name: '', description: '' }],
      }
      return { ...f, contests }
    })

  const removeCandidate = (ci, ki) =>
    setForm((f) => {
      const contests = [...f.contests]
      contests[ci] = {
        ...contests[ci],
        candidates: contests[ci].candidates.filter((_, i) => i !== ki),
      }
      return { ...f, contests }
    })

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setSubmitError('')
    setSubmitSuccess('')

    // Basic validation
    if (!form.title.trim()) return setSubmitError('Election title is required.')
    if (!form.startDate) return setSubmitError('Start date is required.')
    if (!form.endDate) return setSubmitError('End date is required.')
    if (new Date(form.endDate) <= new Date(form.startDate))
      return setSubmitError('End date must be after start date.')
    if (form.contests.length === 0) return setSubmitError('Add at least one contest.')
    for (const [ci, c] of form.contests.entries()) {
      if (!c.title.trim()) return setSubmitError(`Contest ${ci + 1} needs a title.`)
      if (c.candidates.filter((k) => k.name.trim()).length < 2)
        return setSubmitError(`Contest "${c.title}" needs at least 2 candidates.`)
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        title: form.title.trim(),
        electionType: form.electionType,
        startDate: form.startDate,
        endDate: form.endDate,
        restrictedToFaculty:
          form.electionType === 'faculty' && form.restrictedToFaculty
            ? form.restrictedToFaculty
            : null,
        contests: form.contests.map((c, ci) => ({
          id: `contest-${ci + 1}`,
          title: c.title.trim(),
          instructionText: c.instructionText.trim(),
          ruleType: c.ruleType,
          required: true,
          maxSelections:
            c.ruleType === 'multi' && c.maxSelections ? parseInt(c.maxSelections) : null,
          restrictionFaculty: c.restrictionFaculty || null,
          candidates: c.candidates
            .filter((k) => k.name.trim())
            .map((k, ki) => ({
              id: `c${ci}-${ki}`,
              name: k.name.trim(),
              description: k.description.trim(),
            })),
        })),
      }

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/elections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create election')

      setSubmitSuccess(
        data.election.blockchainInitialized
          ? `✅ Election created and initialized on the blockchain! (${data.election.ballotId})`
          : `⚠️ Election saved to database, but blockchain initialization is pending. Use "Init on Blockchain" to retry.`
      )
      setElections((prev) => [data.election, ...prev])
      setForm(emptyElection())
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Blockchain re-init ────────────────────────────────────────────────────

  const handleBlockchainInit = async (ballotId) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/elections/${ballotId}/blockchain-init`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Init failed')
      alert(`✅ ${data.message}`)
      fetchElections()
    } catch (err) {
      alert(`❌ ${err.message}`)
    }
  }

  const handleDelete = async (ballotId) => {
    if (!window.confirm('Delete this election? This cannot be undone.')) return
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'}/api/elections/${ballotId}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('Delete failed')
      setElections((prev) => prev.filter((e) => e.ballotId !== ballotId))
    } catch (err) {
      alert(`❌ ${err.message}`)
    }
  }

  if (loading) return <LoadingSpinner message="Loading elections..." />

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#4A148C', fontWeight: 600 }}>
            Elections Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setCreateOpen(true); setSubmitError(''); setSubmitSuccess('') }}
          >
            + Create New Election
          </Button>
        </Box>

        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        {/* Table */}
        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>NAME</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>TYPE</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>START</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>END</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>BLOCKCHAIN</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {elections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No elections yet. Create one to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                elections.map((election) => (
                  <TableRow key={election.ballotId} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{election.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={election.electionType || 'general'}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(election.startDate)}</TableCell>
                    <TableCell>{formatDate(election.endDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={election.status || 'upcoming'}
                        size="small"
                        sx={{
                          backgroundColor:
                            election.status === 'open' ? '#c8e6c9' :
                            election.status === 'closed' ? '#ffcdd2' : '#fff9c4',
                          color: '#1a1a1a',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {election.blockchainInitialized ? (
                        <Chip label="On-chain ✓" size="small" sx={{ backgroundColor: '#c8e6c9' }} />
                      ) : (
                        <Tooltip title="Click to initialize on blockchain">
                          <Chip
                            label="Pending"
                            size="small"
                            sx={{ backgroundColor: '#ffe0b2', cursor: 'pointer' }}
                            onClick={() => handleBlockchainInit(election.ballotId)}
                            icon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(election.ballotId)}
                          sx={{ backgroundColor: '#d32f2f', color: '#fff', '&:hover': { backgroundColor: '#c62828' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Create Dialog ── */}
        <Dialog
          open={createOpen}
          onClose={() => !submitting && setCreateOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: '8px' } }}
        >
          <DialogTitle sx={{ color: '#4A148C', fontWeight: 600 }}>
            Create New Election
          </DialogTitle>

          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            {submitSuccess && <Alert severity="success">{submitSuccess}</Alert>}

            {/* Basic Info */}
            <TextField
              label="Election Title"
              fullWidth
              required
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="e.g. USC Election 2027"
            />

            <FormControl fullWidth>
              <InputLabel>Election Type</InputLabel>
              <Select
                value={form.electionType}
                label="Election Type"
                onChange={(e) => setField('electionType', e.target.value)}
              >
                <MenuItem value="presidential">Presidential (all students)</MenuItem>
                <MenuItem value="faculty">Faculty-specific</MenuItem>
              </Select>
            </FormControl>

            {form.electionType === 'faculty' && (
              <FormControl fullWidth>
                <InputLabel>Restricted to Faculty</InputLabel>
                <Select
                  value={form.restrictedToFaculty}
                  label="Restricted to Faculty"
                  onChange={(e) => setField('restrictedToFaculty', e.target.value)}
                >
                  {KNOWN_FACULTIES.map((f) => (
                    <MenuItem key={f} value={f}>{f}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
              />
              <TextField
                label="End Date & Time"
                type="datetime-local"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
              />
            </Box>

            <Divider />

            {/* Contests */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#4A148C' }}>
              Contests
            </Typography>

            {form.contests.map((contest, ci) => (
              <Accordion key={ci} defaultExpanded={ci === 0} sx={{ border: '1px solid #e0e0e0' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 500 }}>
                    Contest {ci + 1}: {contest.title || '(untitled)'}
                  </Typography>
                  {form.contests.length > 1 && (
                    <Button
                      size="small"
                      color="error"
                      sx={{ ml: 'auto', mr: 1 }}
                      onClick={(e) => { e.stopPropagation(); removeContest(ci) }}
                    >
                      Remove
                    </Button>
                  )}
                </AccordionSummary>
                <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                  <TextField
                    label="Contest Title"
                    fullWidth
                    required
                    value={contest.title}
                    onChange={(e) => setContest(ci, 'title', e.target.value)}
                    placeholder="e.g. USC President"
                  />

                  <TextField
                    label="Instruction Text"
                    fullWidth
                    value={contest.instructionText}
                    onChange={(e) => setContest(ci, 'instructionText', e.target.value)}
                    placeholder="e.g. Select one candidate"
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Voting Type</InputLabel>
                      <Select
                        value={contest.ruleType}
                        label="Voting Type"
                        onChange={(e) => setContest(ci, 'ruleType', e.target.value)}
                      >
                        <MenuItem value="single">Single choice</MenuItem>
                        <MenuItem value="multi">Multiple choice</MenuItem>
                        <MenuItem value="ranked">Ranked</MenuItem>
                      </Select>
                    </FormControl>

                    {contest.ruleType === 'multi' && (
                      <TextField
                        label="Max selections"
                        type="number"
                        fullWidth
                        value={contest.maxSelections}
                        onChange={(e) => setContest(ci, 'maxSelections', e.target.value)}
                        inputProps={{ min: 1 }}
                      />
                    )}

                    <FormControl fullWidth>
                      <InputLabel>Faculty Restriction</InputLabel>
                      <Select
                        value={contest.restrictionFaculty}
                        label="Faculty Restriction"
                        onChange={(e) => setContest(ci, 'restrictionFaculty', e.target.value)}
                      >
                        <MenuItem value="">None (all students)</MenuItem>
                        {KNOWN_FACULTIES.map((f) => (
                          <MenuItem key={f} value={f}>{f}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {/* Candidates */}
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#616161', mt: 1 }}>
                    Candidates
                  </Typography>
                  {contest.candidates.map((candidate, ki) => (
                    <Box key={ki} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        label={`Candidate ${ki + 1} name`}
                        required
                        value={candidate.name}
                        onChange={(e) => setCandidate(ci, ki, 'name', e.target.value)}
                        sx={{ flex: 2 }}
                      />
                      <TextField
                        label="Description (optional)"
                        value={candidate.description}
                        onChange={(e) => setCandidate(ci, ki, 'description', e.target.value)}
                        sx={{ flex: 3 }}
                      />
                      {contest.candidates.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeCandidate(ci, ki)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => addCandidate(ci)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Candidate
                  </Button>
                </AccordionDetails>
              </Accordion>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addContest}
              sx={{ alignSelf: 'flex-start' }}
            >
              Add Contest
            </Button>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              variant="contained"
            >
              {submitting ? 'Creating...' : 'Create Election'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}
