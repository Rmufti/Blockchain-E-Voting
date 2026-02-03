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
} from '@mui/material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const ElectionsManagementPage = () => {
  const [elections, setElections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchElections()
  }, [])

  const fetchElections = async () => {
    try {
      setLoading(true)
      setError('')
      // Mock data for now
      setElections([
        {
          id: 'election-1',
          name: 'USC Election 2026',
          type: 'General',
          date: '2026-02-15T06:00:00Z',
          status: 'UPCOMING',
        },
        {
          id: 'election-2',
          name: 'Faculty Council Election 2025',
          type: 'General',
          date: '2025-12-01T06:00:00Z',
          status: 'UPCOMING',
        },
      ])
    } catch (err) {
      setError(err.message || 'Failed to load elections.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleEdit = (electionId) => {
    // TODO: Navigate to edit page
    console.log('Edit election:', electionId)
  }

  const handleDelete = (electionId) => {
    // TODO: Show confirmation and delete
    if (window.confirm('Are you sure you want to delete this election?')) {
      console.log('Delete election:', electionId)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading elections..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#4A148C', fontWeight: 600 }}>
            Elections Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ textTransform: 'none' }}
            onClick={() => console.log('Create new election')}
          >
            + Create New Election
          </Button>
        </Box>

        {error && <ErrorAlert message={error} onClose={() => setError('')} />}

        <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>NAME</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>TYPE</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>DATE</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {elections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No elections found. Create your first election to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                elections.map((election) => (
                  <TableRow key={election.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{election.name}</TableCell>
                    <TableCell>{election.type}</TableCell>
                    <TableCell>{formatDate(election.date)}</TableCell>
                    <TableCell>
                      <Chip
                        label={election.status}
                        size="small"
                        sx={{
                          backgroundColor: election.status === 'UPCOMING' ? '#ffc107' : '#e0e0e0',
                          color: election.status === 'UPCOMING' ? '#000000' : '#616161',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(election.id)}
                          sx={{
                            backgroundColor: '#1976d2',
                            color: '#ffffff',
                            '&:hover': { backgroundColor: '#1565c0' },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(election.id)}
                          sx={{
                            backgroundColor: '#d32f2f',
                            color: '#ffffff',
                            '&:hover': { backgroundColor: '#c62828' },
                          }}
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
      </Container>
    </Box>
  )
}

export default ElectionsManagementPage
