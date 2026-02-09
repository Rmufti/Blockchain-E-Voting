/*
 * Unit Tests for contractVoting
 */
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

// Import YOUR code
const ContractVoting = require('../lib/contractVoting.js');

describe('ContractVoting Unit Tests', () => {
    let contract;
    let ctx;
    let mockStub;

    beforeEach(() => {
        contract = new ContractVoting();
        mockStub = {
            getState: sinon.stub(), 
            putState: sinon.stub(), 
            createCompositeKey: sinon.stub(),
        };
        ctx = { stub: mockStub };
    });

    describe('InitElection', () => {
        it('should create an Open election', async () => {
            await contract.InitElection(ctx, 'election1', 'UWO President');
            sinon.assert.calledOnce(mockStub.putState);
            const savedData = JSON.parse(mockStub.putState.getCall(0).args[1].toString());
            
            // FIX 1: Expect 'OPEN' (Uppercase) to match your code
            expect(savedData.Status).to.equal('OPEN');
        });
    });

    describe('CastVote', () => {
        it('should cast a vote successfully', async () => {
            // Mock: Election exists and is OPEN
            mockStub.getState.withArgs('election1').resolves(Buffer.from(JSON.stringify({Status: 'OPEN'})));
            mockStub.createCompositeKey.returns('vote_election1_student1');
            // Mock: Vote does NOT exist
            mockStub.getState.withArgs('vote_election1_student1').resolves(null);

            // FIX 2: Call 'CastVote' (Singular) to match your code
            await contract.CastVote(ctx, 'election1', 'student1', 'Alice');

            sinon.assert.calledWith(mockStub.putState, 'vote_election1_student1');
        });

        it('should FAIL if election does not exist', async () => {
            // Mock: Election returns null (doesn't exist)
            mockStub.getState.withArgs('election1').resolves(null);

            let error = null;
            try {
                // FIX 3: Call 'CastVote' (Singular)
                await contract.CastVote(ctx, 'election1', 'student1', 'Alice');
            } catch (err) { error = err; }

            expect(error.message).to.include('does not exist');
        });
    });
});