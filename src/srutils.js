#!/usr/bin/env node

import program from 'commander';
import Snoowrap from 'snoowrap';
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
  .action(arg => {
    const [, subreddit] = arg.split('/');
    backup(r, subreddit);
  });

program
  .command('restore <archive>')
  .description(
    `Restores a subreddit's settings and styles from a backup zip archive.`
  )
  .action(archive => restore(r, archive));

program.parse(process.argv);
