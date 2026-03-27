import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002'


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
    return error.response.data?.message || error.response.data?.error || 'An error occurred'
  } else if (error.request) {
    return 'No response from server. Please check your connection.'
  } else {
    return error.message || 'An unexpected error occurred'
  }
}

// API service functions
export const apiService = {
  login: async (email, password, userType = 'voter') => {
    try {
      const response = await api.post('/api/auth/login', { email, password, userType })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getBallots: async () => {
    try {
      // FIXED: Pointing to your backend's elections route
      const response = await api.get('/api/elections')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getBallot: async (ballotId) => {
    try {
      // FIXED: Pointing to your backend's elections route
      const response = await api.get(`/api/elections/${ballotId}`)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  submitBallot: async (ballotId, selections) => {
    try {
      // FIXED: Pointing to your backend's elections route
      const response = await api.post(`/api/elections/${ballotId}/submit`, { selections })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getVotingReceipts: async () => {
    try {
      const response = await api.get('/api/voting-receipts')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getCurrentElection: async () => {
    try {
      const response = await api.get('/api/elections/current-active')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  submitVote: async (payload) => {
    try {
      const response = await api.post('/api/votes', payload)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getAdminStats: async () => {
    try {
      const response = await api.get('/api/admin/stats')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getAdminResults: async (electionId) => {
    try {
      const response = await api.get(`/api/admin/results/${electionId}`)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  getStudentStats: async () => {
    try {
      const response = await api.get('/api/student/stats')
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },
  
  getAdminElections: async () => {
    try {
      const response = await api.get('/api/elections', { params: { scope: 'manage' } })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  updateElection: async (ballotId, updates) => {
    try {
      const response = await api.put(`/api/elections/${ballotId}`, updates)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  searchStudents: async (query, faculty = null) => {
    try {
      const params = { q: query }
      if (faculty) params.faculty = faculty
      const response = await api.get('/api/admin/students/search', { params })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  searchAllUsers: async (query) => {
    try {
      const response = await api.get('/api/admin/users/search', { params: { q: query } })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  delegateRole: async (targetUserId, targetRole, faculty = null) => {
    try {
      const body = { targetUserId, targetRole }
      if (faculty) body.faculty = faculty
      const response = await api.post('/api/admin/access/delegate', body)
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },

  revokeRole: async (targetUserId) => {
    try {
      const response = await api.post('/api/admin/access/revoke', { targetUserId })
      return response
    } catch (error) {
      throw { message: parseError(error), originalError: error }
    }
  },
}

export default api