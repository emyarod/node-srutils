import fs from 'fs';
import JSZip from 'jszip';
import {
  editSettings as restoreSettings,
  createUserFlairTemplates as restoreUserFlairTemplates,
  updateStylesheet as restoreStylesheet,
} from '../_util';

// TODO: restore about/flair settings and link flair templates

// FIXME: figure out how to pass in Readable stream to snoowrap
// https://github.com/not-an-aardvark/snoowrap/issues/122
// const restoreStylesheetImages = (r, subreddit, stylesheetImages) =>
//   stylesheetImages.forEach(image => {
//     console.log(`Restoring ${image.name}`);
//     const [name, imageType] = image.name.split('.');
//     console.log({ name, imageType, file: image.data });
//     return r
//       .getSubreddit(subreddit)
//       .uploadSubredditImage({ name, imageType, file: image.data });
//   });
const restoreStylesheetImages = (r, subreddit, stylesheetImages) =>
  Promise.all(
    stylesheetImages.map(async ({ name: filename, path: file }) => {
      const [name, imageType] = filename.split('.');
      console.log(`Uploading ${filename}...`);
      return r
        .getSubreddit(subreddit)
        .uploadStylesheetImage({
          name,
          imageType,
          file,
        })
        .catch(console.error);
    })
  )
    .then(data => data)
    .catch(console.error);
const restoreSubredditImages = (
  r,
  subreddit,
  { header = null, icon = null, banner = null }
) => {
  const promises = [];
  if (header) {
    console.log('Restoring subreddit header image...');
    promises.push(
      r
        .getSubreddit(subreddit)
        .uploadHeaderImage({
          imageType: header.extension,
          file: header.path,
        })
        .catch(console.error)
    );
  }
  if (icon) {
    console.log('Restoring subreddit icon image...');
    promises.push(
      r
        .getSubreddit(subreddit)
        .uploadIcon({
          imageType: icon.extension,
          file: icon.path,
        })
        .catch(console.error)
    );
  }
  if (banner) {
    console.log('Restoring subreddit banner image...');
    promises.push(
      r
        .getSubreddit(subreddit)
        .uploadBannerImage({
          imageType: banner.extension,
          file: banner.path,
        })
        .catch(console.error)
    );
  }
  return Promise.all(promises)
    .then(data => data)
    .catch(console.error);
};

export default function restore(r, archive) {
  fs.readFile(archive, (err, archiveData) => {
    if (err) throw err;
    JSZip.loadAsync(archiveData)
      .then(async zip => {
        const [subreddit] = archive.split('_');
        const [settings, flair, stylesheet] = await Promise.all(
          [['settings', 'json'], ['flair', 'json'], ['stylesheet', 'css']].map(
            ([filename, extension]) =>
              zip.file(`${subreddit}/${filename}.${extension}`)
                ? zip
                    .file(`${subreddit}/${filename}.${extension}`)
                    .async('string')
                : zip.file(`${subreddit}/${filename}.${extension}`)
          )
        ).then(files => files);
        const stylesheetImagesArray = JSON.parse(
          await zip
            .file(`${subreddit}/stylesheet_image_array.json`)
            .async('string')
        );
        // FIXME: figure out how to pass in Readable stream to snoowrap
        // https://github.com/not-an-aardvark/snoowrap/issues/122
        // const stylesheetImages = await Object.values(zip.files).reduce(
        //   async (p, c) =>
        //     /stylesheet_images/.test(c.name) && !c.dir
        //       ? [
        //           ...(await p),
        //           {
        //             name: c.name.split('/').slice(-1)[0],
        //             data: await c.async('nodebuffer'),
        //           },
        //         ]
        //       : p,
        //   Promise.resolve([])
        // );
        const stylesheetImages = await Object.values(zip.files).reduce(
          async (p, c) => {
            const [filename] = c.name.split('/').slice(-1);
            if (/stylesheet_images/.test(c.name) && !c.dir) {
              if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
              return new Promise(resolve =>
                zip
                  .file(c.name)
                  .nodeStream()
                  .pipe(fs.createWriteStream(`tmp/${filename}`))
                  .on(
                    'finish',
                    async () =>
                      console.log(`tmp/${filename} written.`) ||
                      resolve([
                        ...(await p),
                        {
                          name: c.name.split('/').slice(-1)[0],
                          path: `tmp/${filename}`,
                        },
                      ])
                  )
              );
            }
            return p;
          },
          Promise.resolve([])
        );
        const subredditImages = await Object.values(zip.files).reduce(
          async (p, c) => {
            const [filename] = c.name.split('/').slice(-1);
            const [name, extension] = filename.split('.');
            if (/subreddit_images/.test(c.name) && !c.dir) {
              if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
              return new Promise(resolve =>
                zip
                  .file(c.name)
                  .nodeStream()
                  .pipe(fs.createWriteStream(`tmp/${filename}`))
                  .on(
                    'finish',
                    async () =>
                      console.log(`tmp/${filename} written.`) ||
                      resolve({
                        ...(await p),
                        [name.split('_').slice(-1)]: {
                          extension,
                          path: `tmp/${filename}`,
                        },
                      })
                  )
              );
            }
            return p;
          },
          Promise.resolve({})
        );
        console.log('Restoring settings...');
        restoreSettings(r, subreddit, JSON.parse(settings));
        console.log('Restoring user flair templates...');
        restoreUserFlairTemplates(r, subreddit, JSON.parse(flair));

        // restore stylesheet last to avoid errors with missing images
        Promise.all([
          restoreStylesheetImages(r, subreddit, stylesheetImages),
          restoreSubredditImages(r, subreddit, subredditImages),
        ])
          .then(() =>
            restoreStylesheet(
              r,
              subreddit,
              stylesheetImagesArray,
              stylesheet,
              'Restoring stylesheet'
            )
          )
          .catch(console.error);
        if (!settings || !flair || !stylesheet) {
          throw Error(`${archive} is not a valid subreddit backup`);
        }
      })
      .catch(console.error);
  });
}
