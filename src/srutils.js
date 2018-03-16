#!/usr/bin/env node

import program from 'commander';
import Snoowrap from 'snoowrap';
import fs from 'fs';
import rimraf from 'rimraf';
import didyoumean from 'didyoumean';
import { version } from '../package.json';
import keys from '../opendoors.json';
import { config, clone, reset, backup, restore } from './commands';

program
  .version(version)
  .option('-u, --username [username]', 'provide reddit username')
  .option(
    '-p, --password [password]',
    'provide reddit password. If you have 2-Factor Authentication enabled, append your 2FA code to the end of your password with a colon (password:code)'
  )
  .parse(process.argv);

if (process.argv.length === 2) {
  program.help();
}

/**
 * You must provide either:
 * (a) clientId, clientSecret, refreshToken
 * (b) clientId, clientSecret, username, password
 */
if (
  !program.args.includes('config') &&
  (!keys.clientId || !keys.clientSecret) &&
  (!keys.refreshToken || !(program.username && program.password))
) {
  console.log(
    'Reddit credentials required. Provide username and password via flags, or create a configuration file to save your OAuth credentials. Check the help menu for more information on how to provide credentials.'
  );
  process.exit(1);
}

// define snoowrap only if current command is not `config`
const r =
  program.args.includes('config') ||
  new Snoowrap({
    userAgent: `Node.js:node-srutils:v${version} (by /u/fiveSeveN_)`,
    username: program.username,
    password: program.password,
    ...keys,
  });

program
  .command('config')
  .description('Configure your credentials for accessing the Reddit API.')
  .action(() => {
    config();
  });

program
  .command('clone <from> <to>')
  .description(
    `Clones the settings and stylesheet from a subreddit to another. All settings and styles will be reset in the destination subreddit and then replaced with the settings and styles from the source subreddit. Must be a moderator of the destination subreddit, and the target subreddit must be visible to you.`
  )
  .action((src, dest) => {
    const [, from] = src.split('/');
    const [, to] = dest.split('/');
    reset(r, to, 'all');
    clone(r, from, to);
  });

program
  .command('reset <subreddit> [filters]')
  .description(
    `Resets a subreddit's default settings and stylesheet. Must have  appropriate permissions to modify subreddit. Filters may be "all" (by  default) to clear all data, or any combination of "css", "images", "header", "icon", "banner", "settings", and "flair".`
  )
  .action((sub, filters) => {
    const [, subreddit] = sub.split('/');
    reset(r, subreddit, filters);
  });

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

program.command('*').action(command => {
  console.error(`Unknown command: ${command}`);
  const commandNames = program.commands.reduce(
    (p, c) => (c._name !== '*' ? [...p, c._name] : p),
    []
  );
  const closeMatch = didyoumean(command, commandNames);
  if (closeMatch) console.error(`Did you mean ${closeMatch}?`);
  process.exit(1);
});

program.parse(process.argv);
process.on('exit', () => {
  if (fs.existsSync('tmp')) {
    console.log('Deleting temporary files...');
    rimraf.sync('tmp');
  }
  console.log('Exiting...');
});
