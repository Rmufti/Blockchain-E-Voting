// tests/votes.test.js
jest.mock('../src/services/api', () => require('../__mocks__/api').default)

import apiService from '../src/services/api'  // default import now

test('login returns mock token', async () => {
  const res = await apiService.login('test@uwo.ca', 'password')
  expect(res.data.token).toBe('mock-student-token-67890')
})
