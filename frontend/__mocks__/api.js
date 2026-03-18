// __mocks__/api.js
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
          resolve({
            data: {
              token: 'mock-student-token-67890',
              user: { id: '2', email, name: 'Student User', faculty: 'SCIENCE' },
              role: 'student',
            },
          })
        } else {
          resolve({ data: { error: 'Invalid credentials' }, status: 401 })
        }
      }, 100)
    })
  },
  getBallots: () =>
    Promise.resolve({
      data: { currentBallots: [{ ballotId: 'ballot-2026-001', title: 'USC Election 2026' }] },
    }),
  getBallot: (ballotId) =>
    Promise.resolve({
      data: { ballotId, title: 'USC Election 2026', contests: [] },
    }),
  submitBallot: (ballotId, selections) =>
    Promise.resolve({
      data: { success: true, transactionId: 'tx-123', message: 'Ballot submitted' },
    }),
  getVotingReceipts: () =>
    Promise.resolve({ data: { receipts: [] } }),
  getCurrentElection: () =>
    Promise.resolve({ data: { electionId: 'election-2024-001', title: 'USC Presidential Election 2024' } }),
  submitVote: (payload) => Promise.resolve({ data: { success: true, transactionId: 'tx-123' } }),
  getAdminStats: () => Promise.resolve({ data: { totalVotes: 100, totalElections: 1 } }),
  getAdminResults: (electionId) =>
    Promise.resolve({ data: { electionId, results: [] } }),
  getStudentStats: () => Promise.resolve({ data: { ongoingElections: 1 } }),
}

// Export a Jest-safe apiService
export const apiService = Object.keys(mockData).reduce((acc, key) => {
  acc[key] = (...args) => mockData[key](...args)
  return acc
}, {})

export default apiService
