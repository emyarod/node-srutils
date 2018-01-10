import fs from 'fs';
import mkdirp from 'mkdirp';
import rp from 'request-promise';
import {
  editSettings as cloneSettings,
  createUserFlairTemplates as cloneUserFlairTemplates,
  updateStylesheet as cloneStylesheet,
} from '../_util';

const cloneStylesheetImages = (r, to, stylesheetImages) =>
  Promise.all(
    stylesheetImages.map(async image => {
      const [, imageType] = image.name.split('.');
      const [name] = image.name
        .split('/')
        .slice(-1)[0]
        .split('.');
      console.log(`Uploading ${name}.${imageType} to /r/${to}...`);
      return r
        .getSubreddit(to)
        .uploadStylesheetImage({
          name,
          imageType,
          file: image.name,
        })
        .catch(console.error);
    })
  ).catch(console.error);
const cloneSubredditImages = (r, from, to, subredditImages) =>
  Promise.all(
    subredditImages.map(async file => {
      const [, imageType] = file.split('.');
      const [name] = file
        .split('/')
        .slice(-1)[0]
        .split('.');
      console.log(file);
      if (name === 'subreddit_header') {
        console.log(`Cloning /r/${from} subreddit header image to /r/${to}...`);
        return r
          .getSubreddit(to)
          .uploadHeaderImage({
            imageType,
            file,
          })
          .catch(console.error);
      }
      if (name === 'mobile_icon') {
        console.log(`Cloning /r/${from} subreddit icon to /r/${to}...`);
        return r
          .getSubreddit(to)
          .uploadIcon({
            imageType,
            file,
          })
          .catch(console.error);
      }
      if (name === 'mobile_banner') {
        console.log(
          `Uploading /r/${from} subreddit banner image to /r/${to}...`
        );
        return r
          .getSubreddit(to)
          .uploadBannerImage({
            imageType,
            file,
          })
          .catch(console.error);
      }
      return null;
    })
  ).catch(console.error);

export default async function clone(r, from, to) {
  mkdirp('tmp/stylesheet_images', err => {
    if (err) console.error(err);
  });
  // backup from to tmp
  // reset to
  // restore
  const settings = await r
    .getSubreddit(from)
    .getSettings()
    .then(data => console.log(`Fetching /r/${from} settings...`) || data)
    .catch(() => console.error(`Could not fetch /r/${from} settings!`));
  const userFlairTemplates = await r
    .getSubreddit(from)
    .getUserFlairTemplates()
    .then(
      data => console.log(`Fetching /r/${from} user flair templates...`) || data
    )
    .catch(() =>
      console.error(`Could not fetch /r/${from} user flair templates!`)
    );
  const stylesheet = await r
    .getSubreddit(from)
    .getStylesheet()
    .then(data => console.log(`Fetching /r/${from} stylesheet...`) || data)
    .catch(
      () => console.error(`/r/${from} does not have a custom stylesheet!`) || ''
    );
  const stylesheetImages = await r
    .oauthRequest({
      uri: `/r/${from}/about/stylesheet.json`,
      json: true,
    })
    .then(
      data =>
        console.log(`Fetching /r/${from} stylesheet images...`) ||
        Promise.all([
          ...data.images.map(async e =>
            rp({
              uri: e.url,
              encoding: null,
            }).then(img => {
              const name = `tmp/stylesheet_images/${e.name}.${
                e.url.split('.').slice(-1)[0]
              }`;
              fs.writeFile(name, img, err => {
                if (err) throw err;
              });
              return { ...e, name };
            })
          ),
        ])
    )
    .catch(console.error);
  const subredditImages = await r
    .oauthRequest({
      uri: `/r/${from}/about.json`,
      json: true,
    })
    .then(
      data =>
        console.log(`Fetching /r/${from} subreddit images...`) ||
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
        ].reduce(async (p, c) => {
          const filename = `tmp/${c.name}.${c.url.split('.').slice(-1)[0]}`;
          return c.url
            ? [
                ...p,
                await rp({ uri: c.url, encoding: null }).then(img => {
                  fs.writeFile(filename, img, err => {
                    if (err) throw err;
                  });
                  return filename;
                }),
              ]
            : p;
        }, [])
    )
    .catch(console.error);
  console.log(`Cloning /r/${from} settings to /r/${to}...`);
  cloneSettings(r, to, settings);
  console.log(`Cloning/r/${from} user flair templates to /r/${to}...`);
  cloneUserFlairTemplates(r, to, userFlairTemplates);

  // restore stylesheet last to avoid errors with missing images
  Promise.all([
    cloneStylesheetImages(r, to, stylesheetImages),
    cloneSubredditImages(r, from, to, subredditImages),
  ])
    .then(() =>
      cloneStylesheet(
        r,
        to,
        stylesheetImages,
        stylesheet,
        `Cloning /r/${from} stylesheet to /r/${to}`
      )
    )
    .catch(console.error);
}
