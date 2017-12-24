#!/usr/bin/env node

import program from 'commander';
import Snoowrap from 'snoowrap';
import fs from 'fs';
import archiver from 'archiver';
import rp from 'request-promise';
import { version } from '../package.json';
import keys from '../opendoors.json';

const r = new Snoowrap({
  userAgent: `Node.js:node-srutils:v${version} (by /u/fiveSeveN_)`,
  ...keys,
});

// TODO: help and options
program.version(version);

const backup = (files, subreddit) => {
  const date = new Date();
  const ISODate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, -5)
    .split('T')
    .reduce((p, c) => `${p}_${c.replace(/:/g, '-')}`, '');
  const output = fs.createWriteStream(
    `${__dirname}/${subreddit}${ISODate}.zip`
  );
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`${archive.pointer()} total bytes`);
    console.log(
      'archiver has been finalized and the output file descriptor has closed.'
    );
  });

  output.on('end', () => console.log('Data has been drained'));

  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      console.log(err);
    } else {
      throw err;
    }
  });

  archive.on('error', err => {
    throw err;
  });

  archive.pipe(output);

  files.forEach(({ name, data }) =>
    archive.append(data, { name: `${subreddit}/${name}` })
  );

  archive.finalize();
};

program
  .command('backup <subreddit> [options]')
  .description(`Backup a subreddit's settings and styles to a zipped archive`)
  .action(async (arg, options) => {
    console.log('sub', arg, 'opt', options);
    const [, subreddit] = arg.split('/');
    const settings = await r
      .getSubreddit(subreddit)
      .getSettings()
      .then(data => ({
        name: 'settings.json',
        data: JSON.stringify(data, null, 2),
      }))
      .catch(console.error);
    const flair = await r
      .getSubreddit(subreddit)
      .getUserFlairTemplates()
      .then(data => ({
        name: 'flair.json',
        data: JSON.stringify(data, null, 2),
      }))
      .catch(console.error);
    const stylesheet = await r
      .getSubreddit(subreddit)
      .getStylesheet()
      .then(data => ({
        name: 'stylesheet.css',
        data,
      }))
      .catch(console.error);
    const stylesheetImages = await r
      .oauthRequest({
        uri: `/r/${subreddit}/about/stylesheet.json`,
        json: true,
      })
      .then(data =>
        Promise.all(
          data.images.map(async e => ({
            name: `stylesheet_images/${e.name}.${
              e.url.split('.').slice(-1)[0]
            }`,
            data: await rp({
              uri: e.url,
              encoding: null,
            }),
          }))
        )
      );
    const subredditImages = await r
      .oauthRequest({
        uri: `/r/${subreddit}/about.json`,
        json: true,
      })
      .then(data =>
        Promise.resolve(
          [
            {
              name: 'mobile_banner',
              url: data.banner_img,
            },
            {
              name: 'mobile_icon',
              url: data.icon_img,
            },
            {
              name: 'subreddit_header',
              url: data.header_img,
            },
          ].reduce(
            async (p, c) =>
              c.url
                ? [
                    ...p,
                    {
                      name: `subreddit_images/${c.name}.${
                        c.url.split('.').slice(-1)[0]
                      }`,
                      data: await rp({ uri: c.url, encoding: null }),
                    },
                  ]
                : p,
            []
          )
        )
      );

    backup(
      [settings, flair, stylesheet, ...stylesheetImages, ...subredditImages],
      subreddit
    );
  });

program.parse(process.argv);
