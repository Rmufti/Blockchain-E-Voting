const express = require('express')
const request = require('supertest')

const mockElectionFind = jest.fn()
const mockElectionFindOne = jest.fn()
const mockUserFind = jest.fn()
const mockSubmitVoteTransaction = jest.fn()

jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

jest.mock('../src/middleware/auth', () => async (req, _res, next) => {
  req.userId = req.headers['x-user-id'] || 'test-user-id'
  req.role = req.headers['x-role'] || 'student'
  req.roles = [req.role]
  req.faculty = req.headers['x-faculty'] || null
  next()
})

jest.mock('../src/middleware/roles', () => (...allowedRoles) => (req, res, next) => {
  const list = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles
  if (!list.includes(req.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' })
  }
  next()
})

jest.mock('../src/models/Election', () => ({
  find: (...args) => mockElectionFind(...args),
  findOne: (...args) => mockElectionFindOne(...args),
}))

jest.mock('../src/db', () => ({
  User: {
    find: (...args) => mockUserFind(...args),
  },
}))

jest.mock('../src/services/fabricService', () => ({
  initElection: jest.fn(),
  getElection: jest.fn(),
  submitVoteTransaction: (...args) => mockSubmitVoteTransaction(...args),
}))

const electionsRouter = require('../src/routes/elections')

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/elections', electionsRouter)
  return app
}

describe('hierarchy API rules', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserFind.mockResolvedValue([])
  })

  test('faculty president management scope only queries own faculty elections', async () => {
    mockElectionFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    })

    const app = makeApp()
    const res = await request(app)
      .get('/api/elections?scope=manage')
      .set('x-role', 'faculty_president')
      .set('x-faculty', 'SCIENCE')

    expect(res.status).toBe(200)
    expect(mockElectionFind).toHaveBeenCalledWith({ restrictedToFaculty: 'SCIENCE' })
  })

  test('other-faculty student cannot view private faculty ballot', async () => {
    mockElectionFindOne.mockResolvedValue({
      ballotId: 'b-private',
      restrictedToFaculty: 'SCIENCE',
      voterRestriction: 'all_students',
      contests: [],
      toObject: () => ({ ballotId: 'b-private', contests: [] }),
    })

    const app = makeApp()
    const res = await request(app)
      .get('/api/elections/b-private')
      .set('x-role', 'student')
      .set('x-faculty', 'ARTS')

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/not eligible/i)
  })

  test('usc_vp can view private faculty ballot but cannot participate', async () => {
    mockElectionFindOne
      .mockResolvedValueOnce({
        ballotId: 'b-private',
        restrictedToFaculty: 'SCIENCE',
        voterRestriction: 'faculty_exec_only',
        contests: [],
        toObject: () => ({ ballotId: 'b-private', contests: [] }),
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          ballotId: 'b-private',
          restrictedToFaculty: 'SCIENCE',
          voterRestriction: 'faculty_exec_only',
        }),
      })

    const app = makeApp()

    const viewRes = await request(app)
      .get('/api/elections/b-private')
      .set('x-role', 'usc_vp')
      .set('x-faculty', 'ARTS')

    expect(viewRes.status).toBe(200)

    const submitRes = await request(app)
      .post('/api/elections/b-private/submit')
      .set('x-role', 'usc_vp')
      .set('x-faculty', 'ARTS')
      .send({ selections: { contest1: ['candidate1'] } })

    expect(submitRes.status).toBe(403)
    expect(submitRes.body.error).toMatch(/not eligible/i)
  })

  test('superadmin can participate in private faculty ballot', async () => {
    mockElectionFindOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        ballotId: 'b-private',
        restrictedToFaculty: 'SCIENCE',
        voterRestriction: 'faculty_exec_only',
      }),
    })
    mockSubmitVoteTransaction.mockResolvedValue('tx-superadmin')

    const app = makeApp()
    const res = await request(app)
      .post('/api/elections/b-private/submit')
      .set('x-role', 'admin')
      .set('x-faculty', 'ARTS')
      .send({ selections: { contest1: ['candidate1'] } })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.transactionId).toBe('tx-superadmin')
  })
})
