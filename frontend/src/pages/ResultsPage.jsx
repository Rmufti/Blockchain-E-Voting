import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
} from '@mui/material'
import { apiService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorAlert from '../components/ErrorAlert'

const ResultsPage = () => {
  const { electionId } = useParams()
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (electionId) {
      fetchResults()
    }
  }, [electionId])

  const fetchResults = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiService.getAdminResults(electionId)
      setResults(response.data)
    } catch (err) {
      setError(err.message || 'Failed to load results.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading results..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#ffffff', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ color: '#4A148C' }}>
            {results?.title || 'Election Results'}
          </Typography>
        <Button variant="outlined" onClick={() => navigate('/admin')}>
          Back to Dashboard
        </Button>
      </Box>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      {results && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ color: '#616161' }}>
              Election ID: {results.electionId}
            </Typography>
            <Typography variant="body1" sx={{ color: '#616161' }}>
              Total Votes: {results.totalVotes}
            </Typography>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Candidate</TableCell>
                  <TableCell align="right">Votes</TableCell>
                  <TableCell align="right">Percentage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.results?.map((result, index) => {
                  const percentage =
                    results.totalVotes > 0
                      ? ((result.votes / results.totalVotes) * 100).toFixed(2)
                      : '0.00'
                  return (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">
                        {result.candidateName}
                      </TableCell>
                      <TableCell align="right">{result.votes}</TableCell>
                      <TableCell align="right">{percentage}%</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {!results && !error && (
        <Typography variant="body1" sx={{ color: '#1a1a1a' }}>No results available for this election.</Typography>
      )}
      </Container>
    </Box>
  )
}

export default ResultsPage
