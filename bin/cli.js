#!/usr/bin/env node

/* eslint-disable global-require */
if (process.env.NODE_ENV === 'dev') {
  require('babel-register');
  require('../src/srutils');
} else {
  require('../lib/srutils');
}
