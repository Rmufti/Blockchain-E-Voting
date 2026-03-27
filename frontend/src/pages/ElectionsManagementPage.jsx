import { useState, useEffect, useCallback } from 'react'
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
  Search as SearchIcon,
} from '@mui/icons-material'
import { apiService } from '../services/api'
import api from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const KNOWN_FACULTIES = [
  'SCIENCE',
  'SOCIAL_SCIENCE',
  'FIMS',
  'NURSING',
  'MEDICAL_SCIENCE',
  'HEALTH_SCIENCE',
  'ENGINEERING',
  'ARTS_AND_HUMANITIES',
  'MUSIC',
  'EDUCATION',
  'LAW',
  'IVEY',
]

const emptyContest = () => ({
  title: '',
  instructionText: '',
  ruleType: 'single',
  required: true,
  maxSelections: '',
  restrictionFaculty: '',
  candidates: [{ name: '', description: '', studentUserId: '', email: '', studentNumber: '', faculty: '' }],
})

const emptyElection = () => ({
  title: '',
  electionType: 'presidential',
  voterRestriction: 'all_students',
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

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Student search state (per-contest, per-candidate slot)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [studentSearchResults, setStudentSearchResults] = useState([])
  const [searchingStudents, setSearchingStudents] = useState(false)
  const [activeSearchSlot, setActiveSearchSlot] = useState(null) // { ci, ki, context: 'create'|'edit' }

  useEffect(() => {
    fetchElections()
  }, [])

  const fetchElections = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getAdminElections()
      setElections(response.data?.elections || [])
    } catch (err) {
      setError(err.message || 'Failed to load elections')
      setElections([])
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

  // ── Student search ────────────────────────────────────────────────────────

  const handleStudentSearch = useCallback(async (query, faculty = null) => {
    setSearchingStudents(true)
    try {
      const res = await apiService.searchStudents((query || '').trim(), faculty)
      setStudentSearchResults(res.data?.students || [])
    } catch {
      setStudentSearchResults([])
    } finally {
      setSearchingStudents(false)
    }
  }, [])

  const getSearchFacultyForContext = (context, ci) => {
    const source = context === 'edit' ? editForm : form
    if (!source) return null
    const contestFaculty = source.contests?.[ci]?.restrictionFaculty || null
    const electionFaculty = source.electionType === 'faculty' ? source.restrictedToFaculty || null : null
    return contestFaculty || electionFaculty || null
  }

  const isCandidateLinkedToStudent = (candidate) => Boolean(candidate?.studentUserId)

  const getCandidateIdentityKey = (candidate) =>
    candidate?.studentUserId || candidate?.email || candidate?.studentNumber || null

  const validateCandidatesAreStudents = (contests) => {
    for (const contest of contests || []) {
      const seenCandidates = new Set()

      for (const candidate of contest.candidates || []) {
        if ((candidate.name || '').trim() && !isCandidateLinkedToStudent(candidate)) {
          return `Candidate "${candidate.name}" in contest "${contest.title}" must be selected from student search.`
        }

        const candidateKey = getCandidateIdentityKey(candidate)
        if (candidateKey) {
          if (seenCandidates.has(candidateKey)) {
            return `Candidate "${candidate.name}" is duplicated in contest "${contest.title}".`
          }
          seenCandidates.add(candidateKey)
        }
      }
    }
    return null
  }

  const getAvailableStudentResults = (contests, ci, ki) => {
    const selectedKeys = new Set(
      ((contests?.[ci]?.candidates) || [])
        .filter((_, candidateIndex) => candidateIndex !== ki)
        .map((candidate) => getCandidateIdentityKey(candidate))
        .filter(Boolean)
    )

    return studentSearchResults.filter((student) => !selectedKeys.has(student._id || student.email || student.studentNumber))
  }

  const selectStudent = (student, ci, ki, context) => {
    const setter = context === 'edit' ? setEditCandidate : setCandidate
    setter(ci, ki, 'name', student.fullName)
    setter(ci, ki, 'description', `${student.faculty || ''} — ${student.studentNumber || ''}`.trim())
    setter(ci, ki, 'studentUserId', student._id)
    setter(ci, ki, 'email', student.email || '')
    setter(ci, ki, 'studentNumber', student.studentNumber || '')
    setter(ci, ki, 'faculty', student.faculty || '')
    setActiveSearchSlot(null)
    setStudentSearchQuery('')
    setStudentSearchResults([])
  }

  const handleCandidateNameInput = (context, ci, ki, value) => {
    const setter = context === 'edit' ? setEditCandidate : setCandidate
    setter(ci, ki, 'name', value)
    setter(ci, ki, 'description', '')
    setter(ci, ki, 'studentUserId', '')
    setter(ci, ki, 'email', '')
    setter(ci, ki, 'studentNumber', '')
    setter(ci, ki, 'faculty', '')

    setActiveSearchSlot({ ci, ki, context })
    setStudentSearchQuery(value)
    handleStudentSearch(value, getSearchFacultyForContext(context, ci))
  }

  // ── Edit helpers ──────────────────────────────────────────────────────────

  const openEditDialog = (election) => {
    setEditForm({
      ballotId: election.ballotId,
      title: election.title,
      electionType: election.electionType || 'presidential',
      voterRestriction: election.voterRestriction || 'all_students',
      status: election.status || 'upcoming',
      startDate: election.startDate ? new Date(election.startDate).toISOString().slice(0, 16) : '',
      endDate: election.endDate ? new Date(election.endDate).toISOString().slice(0, 16) : '',
      restrictedToFaculty: election.restrictedToFaculty || '',
      contests: (election.contests || []).map((c) => ({
        id: c.id,
        title: c.title,
        instructionText: c.instructionText || '',
        ruleType: c.ruleType || 'single',
        required: c.required !== false,
        maxSelections: c.maxSelections || '',
        restrictionFaculty: c.restrictionFaculty || '',
        candidates: (c.candidates || [])
          .filter((k) => k.studentUserId || k.email || k.studentNumber)
          .map((k) => ({
          name: k.name,
          description: k.description || '',
          studentUserId: k.studentUserId || '',
          email: k.email || '',
          studentNumber: k.studentNumber || '',
          faculty: k.faculty || '',
          })),
      })),
    })
    setEditError('')
    setEditSuccess('')
    setEditOpen(true)
  }

  const setEditField = (field, value) =>
    setEditForm((f) => ({ ...f, [field]: value }))

  const setEditContest = (ci, field, value) =>
    setEditForm((f) => {
      const contests = [...f.contests]
      contests[ci] = { ...contests[ci], [field]: value }
      return { ...f, contests }
    })

  const addEditContest = () =>
    setEditForm((f) => ({ ...f, contests: [...f.contests, emptyContest()] }))

  const removeEditContest = (ci) =>
    setEditForm((f) => ({ ...f, contests: f.contests.filter((_, i) => i !== ci) }))

  const setEditCandidate = (ci, ki, field, value) =>
    setEditForm((f) => {
      const contests = [...f.contests]
      const candidates = [...contests[ci].candidates]
      candidates[ki] = { ...candidates[ki], [field]: value }
      contests[ci] = { ...contests[ci], candidates }
      return { ...f, contests }
    })

  const addEditCandidate = (ci) =>
    setEditForm((f) => {
      const contests = [...f.contests]
      contests[ci] = {
        ...contests[ci],
        candidates: [...contests[ci].candidates, { name: '', description: '', studentUserId: '', email: '', studentNumber: '', faculty: '' }],
      }
      return { ...f, contests }
    })

  const removeEditCandidate = (ci, ki) =>
    setEditForm((f) => {
      const contests = [...f.contests]
      contests[ci] = {
        ...contests[ci],
        candidates: contests[ci].candidates.filter((_, i) => i !== ki),
      }
      return { ...f, contests }
    })

  const handleEditSave = async () => {
    setEditError('')
    setEditSuccess('')
    if (!editForm.title.trim()) return setEditError('Title required.')
    const editCandidateValidationError = validateCandidatesAreStudents(editForm.contests)
    if (editCandidateValidationError) return setEditError(editCandidateValidationError)
    setEditSubmitting(true)
    try {
      const payload = {
        title: editForm.title.trim(),
        status: editForm.status,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        restrictedToFaculty: editForm.restrictedToFaculty || null,
        voterRestriction: editForm.voterRestriction || 'all_students',
        contests: (editForm.contests || []).map((c, ci) => ({
          id: c.id || `contest-${ci + 1}`,
          title: (c.title || '').trim(),
          instructionText: (c.instructionText || '').trim(),
          ruleType: c.ruleType || 'single',
          required: c.required !== false,
          maxSelections:
            c.ruleType === 'multi' && c.maxSelections
              ? parseInt(c.maxSelections, 10)
              : null,
          restrictionFaculty: c.restrictionFaculty || null,
          candidates: (c.candidates || [])
            .filter((k) => (k.name || '').trim())
            .map((k, ki) => ({
              id: `c${ci}-${ki}`,
              name: (k.name || '').trim(),
              description: (k.description || '').trim(),
              studentUserId: k.studentUserId || null,
              email: k.email || null,
              studentNumber: k.studentNumber || null,
              faculty: k.faculty || null,
            })),
        })),
      }
      await apiService.updateElection(editForm.ballotId, payload)
      setEditSuccess('Election updated!')
      // Refresh list
      fetchElections()
      setTimeout(() => setEditOpen(false), 800)
    } catch (err) {
      setEditError(err.message || 'Failed to update')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleStatusToggle = async (election) => {
    const newStatus = election.status === 'open' ? 'closed' : 'open'
    try {
      await apiService.updateElection(election.ballotId, { status: newStatus })
      fetchElections()
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    }
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
        candidates: [...contests[ci].candidates, { name: '', description: '', studentUserId: '', email: '', studentNumber: '', faculty: '' }],
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
    const createCandidateValidationError = validateCandidatesAreStudents(form.contests)
    if (createCandidateValidationError) return setSubmitError(createCandidateValidationError)

    setSubmitting(true)
    try {
      const payload = {
        title: form.title.trim(),
        electionType: form.electionType,
        voterRestriction: form.voterRestriction,
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
              studentUserId: k.studentUserId || null,
              email: k.email || null,
              studentNumber: k.studentNumber || null,
              faculty: k.faculty || null,
            })),
        })),
      }

      const res = await api.post('/api/elections', payload)
      const data = res.data

      setSubmitSuccess(
        data.election?.blockchainInitialized
          ? `✅ Election created and initialized on the blockchain! (${data.election.ballotId})`
          : `⚠️ Election saved to database, but blockchain initialization is pending.`
      )
      if (data.election) setElections((prev) => [data.election, ...prev])
      setForm(emptyElection())
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Blockchain re-init ────────────────────────────────────────────────────

  const handleBlockchainInit = async (ballotId) => {
    try {
      const res = await api.post(`/api/elections/${ballotId}/blockchain-init`)
      alert(`✅ ${res.data.message}`)
      fetchElections()
    } catch (err) {
      alert(`❌ ${err.response?.data?.error || err.message}`)
    }
  }

  const handleDelete = async (ballotId) => {
    if (!window.confirm('Delete this election? This cannot be undone.')) return
    try {
      await api.delete(`/api/elections/${ballotId}`)
      setElections((prev) => prev.filter((e) => e.ballotId !== ballotId))
    } catch (err) {
      alert(`❌ ${err.response?.data?.error || err.message}`)
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
                        onClick={() => handleStatusToggle(election)}
                        sx={{
                          cursor: 'pointer',
                          backgroundColor:
                            election.status === 'open' ? '#c8e6c9' :
                            election.status === 'closed' ? '#ffcdd2' : '#fff9c4',
                          color: '#1a1a1a',
                          fontWeight: 500,
                          textTransform: 'capitalize',
                          '&:hover': { opacity: 0.8 },
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
                          onClick={() => openEditDialog(election)}
                          sx={{ backgroundColor: '#4A148C', color: '#fff', '&:hover': { backgroundColor: '#38006B' } }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
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
              <>
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

                <FormControl fullWidth>
                  <InputLabel>Voter Restriction</InputLabel>
                  <Select
                    value={form.voterRestriction}
                    label="Voter Restriction"
                    onChange={(e) => setField('voterRestriction', e.target.value)}
                  >
                    <MenuItem value="all_students">All students in this faculty</MenuItem>
                    <MenuItem value="faculty_exec_only">Faculty executives only</MenuItem>
                  </Select>
                </FormControl>
              </>
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
                    <Box key={ki}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          label={`Candidate ${ki + 1} name`}
                          required
                          value={candidate.name}
                          onChange={(e) => handleCandidateNameInput('create', ci, ki, e.target.value)}
                          sx={{ flex: 2 }}
                          helperText={candidate.studentUserId ? 'Linked to student record' : 'Pick from student search'}
                        />
                        <TextField
                          label="Description (optional)"
                          value={candidate.description}
                          InputProps={{ readOnly: true }}
                          sx={{ flex: 3 }}
                        />
                        <Tooltip title="Search student from database">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setActiveSearchSlot({ ci, ki, context: 'create' })
                              setStudentSearchQuery('')
                              handleStudentSearch('', getSearchFacultyForContext('create', ci))
                            }}
                          >
                            <SearchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
                      {activeSearchSlot?.ci === ci && activeSearchSlot?.ki === ki && activeSearchSlot?.context === 'create' && (
                        <Box sx={{ ml: 1, mt: 1, mb: 1, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="Search by name, email, or student ID..."
                            value={studentSearchQuery}
                            onChange={(e) => {
                              setStudentSearchQuery(e.target.value)
                              handleStudentSearch(e.target.value, getSearchFacultyForContext('create', ci))
                            }}
                            autoFocus
                            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#9e9e9e' }} /> }}
                          />
                          {searchingStudents && <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>Searching...</Typography>}
                          {getAvailableStudentResults(form.contests, ci, ki).length > 0 && (
                            <Box sx={{ mt: 1, maxHeight: 160, overflowY: 'auto' }}>
                              {getAvailableStudentResults(form.contests, ci, ki).map((s) => (
                                <Box
                                  key={s._id}
                                  onClick={() => selectStudent(s, ci, ki, 'create')}
                                  sx={{
                                    p: 1, cursor: 'pointer', borderRadius: 1,
                                    '&:hover': { backgroundColor: '#e8e8e8' },
                                    display: 'flex', justifyContent: 'space-between',
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.fullName}</Typography>
                                  <Typography variant="caption" color="text.secondary">{s.studentNumber} · {s.faculty}</Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                          {!searchingStudents && studentSearchQuery.length >= 0 && getAvailableStudentResults(form.contests, ci, ki).length === 0 && (
                            <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#9e9e9e' }}>No students found.</Typography>
                          )}
                          <Button size="small" onClick={() => setActiveSearchSlot(null)} sx={{ mt: 0.5 }}>Close</Button>
                        </Box>
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

        {/* ── Edit Dialog ── */}
        <Dialog
          open={editOpen}
          onClose={() => !editSubmitting && setEditOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: '8px' } }}
        >
          <DialogTitle sx={{ color: '#4A148C', fontWeight: 600 }}>
            Edit Election
          </DialogTitle>

          {editForm && (
            <>
              <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
                {editError && <Alert severity="error">{editError}</Alert>}
                {editSuccess && <Alert severity="success">{editSuccess}</Alert>}

                <TextField
                  label="Election Title"
                  fullWidth
                  required
                  value={editForm.title}
                  onChange={(e) => setEditField('title', e.target.value)}
                />

                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status}
                    label="Status"
                    onChange={(e) => setEditField('status', e.target.value)}
                  >
                    <MenuItem value="upcoming">Upcoming</MenuItem>
                    <MenuItem value="open">Open (Active)</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Start Date & Time"
                    type="datetime-local"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={editForm.startDate}
                    onChange={(e) => setEditField('startDate', e.target.value)}
                  />
                  <TextField
                    label="End Date & Time"
                    type="datetime-local"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={editForm.endDate}
                    onChange={(e) => setEditField('endDate', e.target.value)}
                  />
                </Box>

                <FormControl fullWidth>
                  <InputLabel>Faculty Restriction</InputLabel>
                  <Select
                    value={editForm.restrictedToFaculty}
                    label="Faculty Restriction"
                    onChange={(e) => setEditField('restrictedToFaculty', e.target.value)}
                  >
                    <MenuItem value="">None (all students)</MenuItem>
                    {KNOWN_FACULTIES.map((f) => (
                      <MenuItem key={f} value={f}>{f}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {editForm.electionType === 'faculty' && (
                  <FormControl fullWidth>
                    <InputLabel>Voter Restriction</InputLabel>
                    <Select
                      value={editForm.voterRestriction}
                      label="Voter Restriction"
                      onChange={(e) => setEditField('voterRestriction', e.target.value)}
                    >
                      <MenuItem value="all_students">All students in this faculty</MenuItem>
                      <MenuItem value="faculty_exec_only">Faculty executives only</MenuItem>
                    </Select>
                  </FormControl>
                )}

                <Divider />

                {/* Contests (read + edit candidates with student search) */}
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#4A148C' }}>
                  Contests
                </Typography>

                {editForm.contests.map((contest, ci) => (
                  <Accordion key={ci} defaultExpanded={ci === 0} sx={{ border: '1px solid #e0e0e0' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: 500 }}>
                        Contest {ci + 1}: {contest.title || '(untitled)'}
                      </Typography>
                      {editForm.contests.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                          sx={{ ml: 'auto', mr: 1 }}
                          onClick={(e) => { e.stopPropagation(); removeEditContest(ci) }}
                        >
                          Remove
                        </Button>
                      )}
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        label="Contest Title"
                        fullWidth
                        value={contest.title}
                        onChange={(e) => setEditContest(ci, 'title', e.target.value)}
                      />
                      <TextField
                        label="Instruction Text"
                        fullWidth
                        value={contest.instructionText}
                        onChange={(e) => setEditContest(ci, 'instructionText', e.target.value)}
                      />
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl fullWidth>
                          <InputLabel>Voting Type</InputLabel>
                          <Select
                            value={contest.ruleType}
                            label="Voting Type"
                            onChange={(e) => setEditContest(ci, 'ruleType', e.target.value)}
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
                            onChange={(e) => setEditContest(ci, 'maxSelections', e.target.value)}
                          />
                        )}
                      </Box>

                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#616161', mt: 1 }}>
                        Candidates
                      </Typography>
                      {contest.candidates.map((candidate, ki) => (
                        <Box key={ki}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <TextField
                              label={`Candidate ${ki + 1} name`}
                              value={candidate.name}
                              onChange={(e) => handleCandidateNameInput('edit', ci, ki, e.target.value)}
                              sx={{ flex: 2 }}
                              helperText={candidate.studentUserId ? 'Linked to student record' : 'Pick from student search'}
                            />
                            <TextField
                              label="Description"
                              value={candidate.description}
                              InputProps={{ readOnly: true }}
                              sx={{ flex: 3 }}
                            />
                            <Tooltip title="Search student from database">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setActiveSearchSlot({ ci, ki, context: 'edit' })
                                  setStudentSearchQuery('')
                                  handleStudentSearch('', getSearchFacultyForContext('edit', ci))
                                }}
                              >
                                <SearchIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {contest.candidates.length > 1 && (
                              <IconButton size="small" color="error" onClick={() => removeEditCandidate(ci, ki)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                          {activeSearchSlot?.ci === ci && activeSearchSlot?.ki === ki && activeSearchSlot?.context === 'edit' && (
                            <Box sx={{ ml: 1, mt: 1, mb: 1, p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, backgroundColor: '#fafafa' }}>
                              <TextField
                                size="small"
                                fullWidth
                                placeholder="Search by name, email, or student ID..."
                                value={studentSearchQuery}
                                onChange={(e) => {
                                  setStudentSearchQuery(e.target.value)
                                  handleStudentSearch(e.target.value, getSearchFacultyForContext('edit', ci))
                                }}
                                autoFocus
                                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: '#9e9e9e' }} /> }}
                              />
                              {searchingStudents && <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>Searching...</Typography>}
                              {getAvailableStudentResults(editForm?.contests || [], ci, ki).length > 0 && (
                                <Box sx={{ mt: 1, maxHeight: 160, overflowY: 'auto' }}>
                                  {getAvailableStudentResults(editForm?.contests || [], ci, ki).map((s) => (
                                    <Box
                                      key={s._id}
                                      onClick={() => selectStudent(s, ci, ki, 'edit')}
                                      sx={{
                                        p: 1, cursor: 'pointer', borderRadius: 1,
                                        '&:hover': { backgroundColor: '#e8e8e8' },
                                        display: 'flex', justifyContent: 'space-between',
                                      }}
                                    >
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{s.fullName}</Typography>
                                      <Typography variant="caption" color="text.secondary">{s.studentNumber} · {s.faculty}</Typography>
                                    </Box>
                                  ))}
                                </Box>
                              )}
                              {!searchingStudents && studentSearchQuery.length >= 0 && getAvailableStudentResults(editForm?.contests || [], ci, ki).length === 0 && (
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: '#9e9e9e' }}>No students found.</Typography>
                              )}
                              <Button size="small" onClick={() => setActiveSearchSlot(null)} sx={{ mt: 0.5 }}>Close</Button>
                            </Box>
                          )}
                        </Box>
                      ))}
                      <Button size="small" startIcon={<AddIcon />} onClick={() => addEditCandidate(ci)} sx={{ alignSelf: 'flex-start' }}>
                        Add Candidate
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                ))}

                <Button variant="outlined" startIcon={<AddIcon />} onClick={addEditContest} sx={{ alignSelf: 'flex-start' }}>
                  Add Contest
                </Button>
              </DialogContent>

              <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={() => setEditOpen(false)} disabled={editSubmitting} variant="outlined">
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={editSubmitting} variant="contained">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  )
}
