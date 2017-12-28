import fs from 'fs';
import rp from 'request-promise';
import JSZip from 'jszip';

const createBackup = (files, subreddit) => {
  const date = new Date();
  const ISODate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, -5)
    .split('T')
    .reduce((p, c) => `${p}_${c.replace(/:/g, '-')}`, '');
  const zip = new JSZip();
  const archiveName = `./${subreddit}${ISODate}.zip`;
  files.forEach(
    ({ name, data }) =>
      console.log(`Writing ${name} to archive...`) ||
      zip.file(`${subreddit}/${name}`, data)
  );
  zip
    .generateNodeStream({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
      streamFiles: true,
    })
    .pipe(fs.createWriteStream(archiveName))
    .on('error', err => {
      throw err;
    })
    .on('finish', () => console.log(`${archiveName} written`));
};

export default async function backup(r, subreddit) {
  const settings = await r
    .getSubreddit(subreddit)
    .getSettings()
    .then(
      data =>
        console.log('Saving subreddit settings...') || {
          name: 'settings.json',
          data: JSON.stringify(data, null, 2),
        }
    )
    .catch(console.error);
  const flair = await r
    .getSubreddit(subreddit)
    .getUserFlairTemplates()
    .then(
      data =>
        console.log('Saving flair templates...') || {
          name: 'flair.json',
          data: JSON.stringify(data, null, 2),
        }
    )
    .catch(console.error);
  const stylesheet = await r
    .getSubreddit(subreddit)
    .getStylesheet()
    .then(
      data =>
        console.log('Saving subreddit stylesheet...') || {
          name: 'stylesheet.css',
          data,
        }
    )
    .catch(console.error);
  const createStylesheetImageArray = imagesInfo =>
    console.log('Saving stylesheet image array...') ||
    new Promise(resolve => {
      resolve({
        name: `stylesheet_image_array.json`,
        data: JSON.stringify(imagesInfo),
      });
    });
  const stylesheetImages = await r
    .oauthRequest({
      uri: `/r/${subreddit}/about/stylesheet.json`,
      json: true,
    })
    .then(
      data =>
        console.log('Saving stylesheet images...') ||
        Promise.all([
          ...data.images.map(async e => ({
            name: `stylesheet_images/${e.name}.${
              e.url.split('.').slice(-1)[0]
            }`,
            data: await rp({
              uri: e.url,
              encoding: null,
            }),
          })),
          createStylesheetImageArray(data.images),
        ])
    );
  const subredditImages = await r
    .oauthRequest({
      uri: `/r/${subreddit}/about.json`,
      json: true,
    })
    .then(
      data =>
        console.log('Saving subreddit images...') ||
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

  createBackup(
    [settings, flair, stylesheet, ...stylesheetImages, ...subredditImages],
    subreddit
  );
}
