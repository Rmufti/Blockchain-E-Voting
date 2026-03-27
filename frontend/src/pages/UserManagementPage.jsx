import { useState, useCallback } from 'react'
import {
  Container, Typography, Box, TextField, Card, CardContent, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select,
  FormControl, InputLabel, CircularProgress, Alert,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const FACULTY_SCOPED_ROLES = new Set(['faculty_president', 'councillor', 'meeting_chair'])

const KNOWN_FACULTIES = [
  'SCIENCE', 'SOCIAL_SCIENCE', 'FIMS', 'NURSING', 'MEDICAL_SCIENCE',
  'HEALTH_SCIENCE', 'ENGINEERING', 'ARTS_AND_HUMANITIES', 'MUSIC',
  'EDUCATION', 'LAW', 'IVEY',
]

const ALL_ROLES = [
  { value: 'admin',            label: 'Admin (Super)' },
  { value: 'usc_admin',        label: 'USC Admin' },
  { value: 'usc_president',    label: 'USC President' },
  { value: 'usc_vp',           label: 'USC Vice-President' },
  { value: 'faculty_president',label: 'Faculty President' },
  { value: 'councillor',       label: 'Councillor' },
  { value: 'meeting_chair',    label: 'Meeting Chair' },
  { value: 'student',          label: 'Student' },
]

const ROLE_COLORS = {
  admin:            '#b71c1c',
  usc_admin:        '#c62828',
  usc_president:    '#6a1b9a',
  usc_vp:           '#8e24aa',
  faculty_president:'#1565c0',
  councillor:       '#0277bd',
  meeting_chair:    '#00838f',
  candidate:        '#2e7d32',
  student:          '#757575',
}

// Role hierarchy: lower number = higher rank
const ROLE_RANK = {
  admin:            0,
  usc_admin:        0,
  usc_president:    1,
  usc_vp:           2,
  faculty_president:3,
  councillor:       4,
  meeting_chair:    4,
  candidate:        5,
  student:          6,
}

const getAssignableRoles = (currentRole) => {
  const rank = ROLE_RANK[currentRole];
  if (rank === undefined) return []; // no permission
  if (rank <= 0) {
    // admin/usc_admin can assign any role
    return ALL_ROLES;
  }
  // Others can assign roles with equal or higher rank (higher number)
  return ALL_ROLES.filter(r => (ROLE_RANK[r.value] || 999) >= rank);
}

const UserManagementPage = () => {
  const { role: currentUserRole, user: currentUser } = useAuth()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newRole, setNewRole] = useState('')
  const [newFaculty, setNewFaculty] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const assignableRoles = getAssignableRoles(currentUserRole)
  const currentUserEmail = currentUser?.email ? String(currentUser.email).toLowerCase() : ''

  const handleSearch = useCallback(async (value) => {
    setSearching(true)
    setSearchError('')
    try {
      const res = await apiService.searchAllUsers(value)
      setUsers(res.data?.users || [])
    } catch (err) {
      setSearchError(err.message || 'Search failed')
      setUsers([])
    } finally {
      setSearching(false)
    }
  }, [])

  const openDialog = (user) => {
    setSelectedUser(user)
    setNewRole(user.role || 'student')
    setNewFaculty(
      user.faculty ? String(user.faculty).toUpperCase().replace(/\s+/g, '_') : ''
    )
    setSubmitError('')
    setSubmitSuccess('')
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setSelectedUser(null)
    setSubmitting(false)
  }

  const needsFaculty = FACULTY_SCOPED_ROLES.has(newRole)

  const handleSubmit = async () => {
    if (!selectedUser) return
    if (needsFaculty && !newFaculty) {
      setSubmitError('Faculty is required for this role.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      if (newRole === 'student') {
        await apiService.revokeRole(selectedUser._id)
      } else {
        await apiService.delegateRole(
          selectedUser._id,
          newRole,
          needsFaculty ? newFaculty : null,
        )
      }
      setUsers((prev) =>
        prev.map((u) =>
          u._id === selectedUser._id
            ? { ...u, role: newRole, faculty: needsFaculty ? newFaculty : u.faculty }
            : u,
        ),
      )
      setSubmitSuccess(`Role updated to "${newRole}"`)
      setTimeout(closeDialog, 1200)
    } catch (err) {
      setSubmitError(err.message || 'Failed to update role')
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ color: '#4A148C', mb: 1, fontWeight: 600 }}>
          User Management
        </Typography>
        <Typography variant="body2" sx={{ color: '#616161', mb: 4 }}>
          {assignableRoles.length === 0
            ? 'Your role does not have permission to manage other users.'
            : 'Search for any user and assign or change their role.'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by name, email or student number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            disabled={assignableRoles.length === 0}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: '#9e9e9e' }} />,
            }}
          />
          <Button
            variant="contained"
            onClick={() => handleSearch(query)}
            disabled={searching || assignableRoles.length === 0}
            sx={{
              px: 3,
              backgroundColor: '#4A148C',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#38006b' },
            }}
          >
            {searching ? <CircularProgress size={20} color="inherit" /> : 'Search'}
          </Button>
        </Box>

        {searchError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {searchError}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map((user) => {
            const isCurrentUser = currentUserEmail && String(user.email || '').toLowerCase() === currentUserEmail

            return (
            <Card
              key={user._id}
              sx={{ border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff' }}
            >
              <CardContent
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {user.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#616161' }}>
                    {user.email}
                    {user.studentNumber && ` · #${user.studentNumber}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      label={user.role || 'student'}
                      size="small"
                      sx={{
                        backgroundColor: ROLE_COLORS[user.role] || '#757575',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                    {user.studentNumber && user.role !== 'student' && (
                      <Chip
                        label="Student (Voter)"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', borderColor: '#2e7d32', color: '#2e7d32' }}
                      />
                    )}
                    {user.faculty && (
                      <Chip
                        label={user.faculty.replace(/_/g, ' ')}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                    {isCurrentUser && (
                      <Chip
                        label="Current Account"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  onClick={() => openDialog(user)}
                  disabled={isCurrentUser}
                  sx={{
                    borderColor: '#4A148C',
                    color: '#4A148C',
                    textTransform: 'none',
                    flexShrink: 0,
                    '&:hover': { backgroundColor: 'rgba(74,20,140,0.05)' },
                  }}
                >
                  Change Role
                </Button>
              </CardContent>
            </Card>
            )
          })}

          {users.length === 0 && !searching && (
            <Typography sx={{ color: '#9e9e9e', textAlign: 'center', mt: 6 }}>
              Search for a user above to manage their role.
            </Typography>
          )}
        </Box>

        {/* Role Assignment Dialog */}
        <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ color: '#4A148C', fontWeight: 600 }}>
            Assign Role
            {selectedUser && (
              <Typography variant="body2" sx={{ color: '#616161', fontWeight: 400, mt: 0.5 }}>
                {selectedUser.fullName}
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            {submitSuccess ? (
              <Alert severity="success" sx={{ mt: 1 }}>
                {submitSuccess}
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {submitError && <Alert severity="error">{submitError}</Alert>}
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={newRole}
                    label="Role"
                    onChange={(e) => {
                      setNewRole(e.target.value)
                      setSubmitError('')
                    }}
                  >
                    {assignableRoles.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {needsFaculty && (
                  <FormControl fullWidth>
                    <InputLabel>Faculty</InputLabel>
                    <Select
                      value={newFaculty}
                      label="Faculty"
                      onChange={(e) => setNewFaculty(e.target.value)}
                    >
                      {KNOWN_FACULTIES.map((f) => (
                        <MenuItem key={f} value={f}>
                          {f.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeDialog} sx={{ textTransform: 'none', color: '#616161' }}>
              Cancel
            </Button>
            {!submitSuccess && (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={submitting}
                sx={{ backgroundColor: '#4A148C', textTransform: 'none', '&:hover': { backgroundColor: '#38006b' } }}
              >
                {submitting ? <CircularProgress size={18} color="inherit" /> : 'Save'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}

export default UserManagementPage
