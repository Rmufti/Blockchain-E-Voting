import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('user')
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Error parser helper
const parseError = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || error.response.data?.error || 'An error occurred'
  } else if (error.request) {
    // Request made but no response
    return 'No response from server. Please check your connection.'
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred'
  }
}

// Mock data
const mockData = {
  login: (email, password, userType = 'voter') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (userType === 'admin' && email === 'admin@uwo.ca' && password === 'admin') {
          resolve({
            data: {
              token: 'mock-admin-token-12345',
              user: { id: '1', email: 'admin@uwo.ca', name: 'Admin User' },
              role: 'admin',
            },
          })
        } else if (userType === 'voter' && email && password) {
          // Mock student with SCIENCE faculty
          resolve({
            data: {
              token: 'mock-student-token-67890',
              user: { id: '2', email: email, name: 'Student User', faculty: 'SCIENCE' },
              role: 'student',
            },
          })
        } else {
          resolve({
            data: { error: 'Invalid credentials or user type' },
            status: 401,
          })
        }
      }, 500)
    })
  },
  getBallots: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            currentBallots: [
              {
                ballotId: 'ballot-2026-001',
                title: 'USC Election 2026',
                startDate: '2026-01-01',
                endDate: '2026-02-15',
                status: 'open',
              },
            ],
          },
        })
      }, 300)
    })
  },
  getBallot: (ballotId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (ballotId === 'ballot-2026-001') {
          resolve({
            data: {
              ballotId: 'ballot-2026-001',
              title: 'USC Election 2026',
              contests: [
                {
                  id: 'contest-1',
                  title: 'USC President',
                  instructionText: 'Rank candidates in order of preference (1 = most preferred)',
                  ruleType: 'ranked',
                  required: true,
                  restrictionFaculty: null,
                  candidates: [
                    { id: 'c1', name: 'John Smith', description: 'Candidate for President' },
                    { id: 'c2', name: 'Sarah Johnson', description: 'Candidate for President' },
                    { id: 'c3', name: 'Michael Chen', description: 'Candidate for President' },
                  ],
                },
                {
                  id: 'contest-2',
                  title: 'Science President',
                  instructionText: 'Select one candidate',
                  ruleType: 'single',
                  required: true,
                  restrictionFaculty: 'SCIENCE',
                  candidates: [
                    { id: 'c4', name: 'Alice Brown', description: 'Science Faculty Candidate' },
                    { id: 'c5', name: 'Bob Wilson', description: 'Science Faculty Candidate' },
                  ],
                },
                {
                  id: 'contest-3',
                  title: 'Science Councillor',
                  instructionText: 'Select up to 6 candidates',
                  ruleType: 'multi',
                  required: true,
                  maxSelections: 6,
                  restrictionFaculty: 'SCIENCE',
                  candidates: [
                    { id: 'c6', name: 'David Lee', description: 'Science Councillor Candidate' },
                    { id: 'c7', name: 'Emma Davis', description: 'Science Councillor Candidate' },
                    { id: 'c8', name: 'Frank Miller', description: 'Science Councillor Candidate' },
                    { id: 'c9', name: 'Grace Taylor', description: 'Science Councillor Candidate' },
                    { id: 'c10', name: 'Henry White', description: 'Science Councillor Candidate' },
                    { id: 'c11', name: 'Ivy Martinez', description: 'Science Councillor Candidate' },
                    { id: 'c12', name: 'Jack Anderson', description: 'Science Councillor Candidate' },
                  ],
                },
                {
                  id: 'contest-4',
                  title: 'Senate – At Large',
                  instructionText: 'Select up to 4 candidates',
                  ruleType: 'multi',
                  required: true,
                  maxSelections: 4,
                  restrictionFaculty: null,
                  candidates: [
                    { id: 'c13', name: 'Karen Thompson', description: 'Senate Candidate' },
                    { id: 'c14', name: 'Liam Garcia', description: 'Senate Candidate' },
                    { id: 'c15', name: 'Mia Rodriguez', description: 'Senate Candidate' },
                    { id: 'c16', name: 'Noah Lewis', description: 'Senate Candidate' },
                    { id: 'c17', name: 'Olivia Walker', description: 'Senate Candidate' },
                  ],
                },
              ],
            },
          })
        } else {
          resolve({ data: null })
        }
      }, 300)
    })
  },
  submitBallot: (ballotId, selections) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            success: true,
            transactionId: 'tx-' + Date.now(),
            message: 'Ballot submitted',
          },
        })
      }, 500)
    })
  },
  getVotingReceipts: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            receipts: [
              {
                ballotId: 'ballot-2025-001',
                ballotTitle: 'USC Election 2025',
                transactionId: 'tx-1704067200000',
                timestamp: '2025-01-01T12:00:00Z',
              },
              {
                ballotId: 'ballot-2025-002',
                ballotTitle: 'Faculty Council Election 2025',
                transactionId: 'tx-1704153600000',
                timestamp: '2025-01-02T12:00:00Z',
              },
            ],
          },
        })
      }, 300)
    })
  },
  // Keep old methods for admin/backward compatibility
  getCurrentElection: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            electionId: 'election-2024-001',
            title: 'USC Presidential Election 2024',
            candidates: [
              { id: '1', name: 'John Smith', description: 'Candidate for President' },
              { id: '2', name: 'Sarah Johnson', description: 'Candidate for President' },
              { id: '3', name: 'Michael Chen', description: 'Candidate for President' },
            ],
          },
        })
      }, 300)
    })
  },
  submitVote: (payload) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            success: true,
            transactionId: 'tx-' + Date.now(),
            message: 'Vote submitted',
          },
        })
      }, 500)
    })
  },
  getAdminStats: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            totalVotes: 1250,
            totalElections: 10,
            activeElections: 1,
            registeredVoters: 5000,
            totalCandidates: 16,
          },
        })
      }, 300)
    })
  },
  getStudentStats: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            ongoingElections: 2,
            votesCast: 1,
            upcomingElections: 2,
            pastElections: 6,
          },
        })
      }, 300)
    })
  },
  getAdminResults: (electionId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          data: {
            electionId: electionId,
            title: 'USC Presidential Election 2024',
            totalVotes: 1250,
            results: [
              { candidateName: 'John Smith', votes: 450 },
              { candidateName: 'Sarah Johnson', votes: 520 },
              { candidateName: 'Michael Chen', votes: 280 },
            ],
          },
        })
      }, 300)
    })
  },
}

// API service functions
export const apiService = {
  login: async (email, password, userType = 'voter') => {
    if (USE_MOCKS) {
      return mockData.login(email, password, userType)
    }
    try {
      const response = await api.post('/api/auth/login', { email, password, userType })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getBallots: async () => {
    if (USE_MOCKS) {
      return mockData.getBallots()
    }
    try {
      const response = await api.get('/api/ballots')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getBallot: async (ballotId) => {
    if (USE_MOCKS) {
      return mockData.getBallot(ballotId)
    }
    try {
      const response = await api.get(`/api/ballots/${ballotId}`)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  submitBallot: async (ballotId, selections) => {
    if (USE_MOCKS) {
      return mockData.submitBallot(ballotId, selections)
    }
    try {
      const response = await api.post(`/api/ballots/${ballotId}/submit`, { selections })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getVotingReceipts: async () => {
    if (USE_MOCKS) {
      return mockData.getVotingReceipts()
    }
    try {
      const response = await api.get('/api/voting-receipts')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  // Keep old methods for admin/backward compatibility
  getCurrentElection: async () => {
    if (USE_MOCKS) {
      return mockData.getCurrentElection()
    }
    try {
      const response = await api.get('/api/elections/current')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  submitVote: async (payload) => {
    if (USE_MOCKS) {
      return mockData.submitVote(payload)
    }
    try {
      const response = await api.post('/api/votes', payload)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getAdminStats: async () => {
    if (USE_MOCKS) {
      return mockData.getAdminStats()
    }
    try {
      const response = await api.get('/api/admin/stats')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getAdminResults: async (electionId) => {
    if (USE_MOCKS) {
      return mockData.getAdminResults(electionId)
    }
    try {
      const response = await api.get(`/api/admin/results/${electionId}`)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getStudentStats: async () => {
    if (USE_MOCKS) {
      return mockData.getStudentStats()
    }
    try {
      const response = await api.get('/api/student/stats')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },
}

export default api
