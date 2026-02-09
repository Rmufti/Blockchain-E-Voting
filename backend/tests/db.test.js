// backend/tests/db.test.js
// these tests validate database constraints and required storage behavior for pr2

const { pool } = require("../src/db");
const {
  createUser,
  getUserByEmail,
  assignRole,
  listRoles,
  getCurrentElection,
  createBallot,
  getBallot,
} = require("../src/repos");

describe("database scope tests", () => {
  let testUserId;
  let election;

  beforeAll(async () => {
    election = await getCurrentElection();
    if (!election) {
      throw new Error("no open election found in seed data");
    }

    // this creates a unique test user for repeatable local runs
    testUserId = await createUser({
      studentNumber: `T${Date.now()}`,
      email: `test_${Date.now()}@uwo.ca`,
      fullName: "test user",
      faculty: "science",
      yearOfStudy: 2,
    });
  });

  afterAll(async () => {
    // this deletes test data to keep local db clean
    await pool.query(`delete from ballots where user_id = $1`, [testUserId]);
    await pool.query(`delete from user_roles where user_id = $1`, [testUserId]);
    await pool.query(`delete from users where user_id = $1`, [testUserId]);
    await pool.end();
  });

  test("can fetch user by email", async () => {
    const user = await getUserByEmail("admin@uwo.ca");
    expect(user).toBeTruthy();
    expect(user.email).toBe("admin@uwo.ca");
  });

  test("roles are scalable and assigned via join table", async () => {
    await assignRole(testUserId, "voter");
    await assignRole(testUserId, "group_member");

    const roles = await listRoles(testUserId);
    expect(roles).toContain("voter");
    expect(roles).toContain("group_member");
  });

  test("stores a ballot with ranking json and blockchain tx id", async () => {
    const ranking = ["candidate a", "candidate b"];
    const tx = `tx_${Date.now()}`;

    await createBallot({
      userId: testUserId,
      electionId: election.election_id,
      rankingJson: ranking,
      blockchainTxId: tx,
    });

    const stored = await getBallot({
      userId: testUserId,
      electionId: election.election_id,
    });

    expect(stored).toBeTruthy();
    expect(stored.blockchain_tx_id).toBe(tx);
    expect(stored.ranking_json).toEqual(ranking);
  });

  test("prevents duplicate ballots per user per election", async () => {
    const ranking = ["candidate a"];
    const tx = `tx_dup_${Date.now()}`;

    await expect(
      createBallot({
        userId: testUserId,
        electionId: election.election_id,
        rankingJson: ranking,
        blockchainTxId: tx,
      })
    ).rejects.toBeTruthy();
  });
});
