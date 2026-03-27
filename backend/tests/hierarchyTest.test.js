jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

const { __testables } = require('../src/routes/elections')

const {
  canViewElection,
  canParticipateInElection,
} = __testables

describe('hierarchyTest - faculty/private election access rules', () => {
  const facultyElectionAllStudents = {
    restrictedToFaculty: 'SCIENCE',
    voterRestriction: 'all_students',
  }

  const facultyElectionExecOnly = {
    restrictedToFaculty: 'SCIENCE',
    voterRestriction: 'faculty_exec_only',
  }

  test('same-faculty student can view and vote in all_students faculty election', () => {
    expect(
      canViewElection({
        userRole: 'student',
        userFaculty: 'SCIENCE',
        election: facultyElectionAllStudents,
      })
    ).toBe(true)

    expect(
      canParticipateInElection({
        userRole: 'student',
        userFaculty: 'SCIENCE',
        election: facultyElectionAllStudents,
      })
    ).toBe(true)
  })

  test('other-faculty student cannot view or vote in faculty-private election', () => {
    expect(
      canViewElection({
        userRole: 'student',
        userFaculty: 'ARTS',
        election: facultyElectionAllStudents,
      })
    ).toBe(false)

    expect(
      canParticipateInElection({
        userRole: 'student',
        userFaculty: 'ARTS',
        election: facultyElectionAllStudents,
      })
    ).toBe(false)
  })

  test('same-faculty exec can view and vote in faculty_exec_only election', () => {
    expect(
      canViewElection({
        userRole: 'faculty_president',
        userFaculty: 'SCIENCE',
        election: facultyElectionExecOnly,
      })
    ).toBe(true)

    expect(
      canParticipateInElection({
        userRole: 'faculty_president',
        userFaculty: 'SCIENCE',
        election: facultyElectionExecOnly,
      })
    ).toBe(true)
  })

  test('same-faculty non-exec student cannot view or vote in faculty_exec_only election', () => {
    expect(
      canViewElection({
        userRole: 'student',
        userFaculty: 'SCIENCE',
        election: facultyElectionExecOnly,
      })
    ).toBe(false)

    expect(
      canParticipateInElection({
        userRole: 'student',
        userFaculty: 'SCIENCE',
        election: facultyElectionExecOnly,
      })
    ).toBe(false)
  })

  test('higher roles can view faculty-private election but cannot participate', () => {
    expect(
      canViewElection({
        userRole: 'usc_vp',
        userFaculty: 'ARTS',
        election: facultyElectionExecOnly,
      })
    ).toBe(true)

    expect(
      canParticipateInElection({
        userRole: 'usc_vp',
        userFaculty: 'ARTS',
        election: facultyElectionExecOnly,
      })
    ).toBe(false)
  })

  test('superadmin can view and participate in any private election', () => {
    expect(
      canViewElection({
        userRole: 'admin',
        userFaculty: 'ARTS',
        election: facultyElectionExecOnly,
      })
    ).toBe(true)

    expect(
      canParticipateInElection({
        userRole: 'admin',
        userFaculty: 'ARTS',
        election: facultyElectionExecOnly,
      })
    ).toBe(true)
  })
})
