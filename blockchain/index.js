'use strict';

// 1. Point it to your voting contract file
const contractVoting = require('./lib/contractVoting.js');

// 2. Export it so Fabric can see it
module.exports.contractVoting = contractVoting;
module.exports.contracts = [ contractVoting ];