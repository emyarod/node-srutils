#!/usr/bin/env node

import program from 'commander';
import Snoowrap from 'snoowrap';
import fs from 'fs';
import rimraf from 'rimraf';
import { version } from '../package.json';
import keys from '../opendoors';
import { backup, restore } from './commands';

const r = new Snoowrap({
  userAgent: `Node.js:node-srutils:v${version} (by /u/fiveSeveN_)`,
  ...keys,
});

// TODO: help and options
program.version(version);

program
  .command('backup <subreddit>')
  .description(
    `Creates a zip archive containing a subreddit's settings and styles.`
  )
  .action(sub => {
    const [, subreddit] = sub.split('/');
    backup(r, subreddit);
  });

program
  .command('restore <archive>')
  .description(
    `Restores a subreddit's settings and styles from a backup zip archive.`
  )
  .action(archive => restore(r, archive));

program.parse(process.argv);
process.on('exit', () => {
  if (fs.existsSync('tmp')) {
    console.log('Deleting temporary files...');
    rimraf.sync('tmp');
  }
  console.log('Exiting...');
});
