'use strict';

/**
 * Requires (Test Modules)
 */
const { expect } = require('chai');

/**
 * Requires (Library)
 */
const http = require('http');

/**
 * Requires (Main App)
 */
const { rendeer } = require('../src/main');

/**
 * Server
 */
const server = http.createServer(rendeer);
const port = process.env.PORT || 3000;
const localhost = `http://localhost:${port}`;

/**
 * Timeout
 */
const timeout = 5000;
describe('rendeer', () => {
  before(() => {
    server.listen(port);
  });
  after(() => {
    server.close();
    process.exit(0);
  });

  it('Fetch lesterchan.net via Path', (done) => {
    http.get(`${localhost}/https://lesterchan.net`, (response) => {
      expect(response.statusCode).to.eql(200);
      done();
    });
  }).timeout(timeout);

  it('Fetch lesterchan.net via Query String', (done) => {
    http.get(`${localhost}/?fetch=https://lesterchan.net`, (response) => {
      expect(response.statusCode).to.eql(200);
      done();
    });
  }).timeout(timeout);
});
