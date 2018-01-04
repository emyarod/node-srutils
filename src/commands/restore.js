import fs from 'fs';
import JSZip from 'jszip';

const restoreSettings = (r, subreddit, settings) =>
  console.log('Restoring settings...') ||
  r.getSubreddit(subreddit).editSettings(settings);
const restoreUserFlairTemplates = (r, subreddit, flair) =>
  console.log('Restoring user flair templates...') ||
  flair.forEach(
    ({
      flair_text: text,
      flair_css_class: cssClass,
      flair_text_editable: textEditable,
    }) =>
      r.getSubreddit(subreddit).createUserFlairTemplate({
        text,
        cssClass,
        textEditable,
      })
  );
const restoreStylesheet = (r, subreddit, stylesheetImagesArray, stylesheet) => {
  /**
   * Replace stylesheet image URL with reddit percent formatted URLs
   * https://stackoverflow.com/a/10726800
   */
  const replacementMap = stylesheetImagesArray.reduce(
    (p, c) => ({
      ...p,
      [`url("${c.url.replace(/https:/, '')}")`]: c.link,
    }),
    {}
  );
  const regex = new RegExp(
    Object.keys(replacementMap)
      .map(e => e.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'))
      .join('|'),
    'g'
  );
  console.log('Restoring stylesheet...');
  return r.getSubreddit(subreddit).updateStylesheet({
    css: stylesheet.replace(regex, match => replacementMap[match]),
    reason: 'node-srutils restore',
  });
};
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
  stylesheetImages.forEach(({ name: filename, path: file }) => {
    const [name, imageType] = filename.split('.');
    console.log(`Uploading ${filename}...`);
    r
      .getSubreddit(subreddit)
      .uploadStylesheetImage({
        name,
        imageType,
        file,
      })
      .then(() => fs.unlinkSync(file))
      .catch(console.error);
  });
const restoreSubredditImages = (
  r,
  subreddit,
  { header = null, icon = null, banner = null }
) => {
  if (header) {
    console.log('Restoring subreddit header image...');
    r
      .getSubreddit(subreddit)
      .uploadHeaderImage({
        imageType: header.extension,
        file: header.path,
      })
      .then(() => fs.unlinkSync(header.path))
      .catch(console.error);
  }
  if (icon) {
    console.log('Restoring subreddit icon image...');
    r
      .getSubreddit(subreddit)
      .uploadIcon({
        imageType: icon.extension,
        file: icon.path,
      })
      .then(() => fs.unlinkSync(icon.path))
      .catch(console.error);
  }
  if (banner) {
    console.log('Restoring subreddit banner image...');
    r
      .getSubreddit(subreddit)
      .uploadBannerImage({
        imageType: banner.extension,
        file: banner.path,
      })
      .then(() => fs.unlinkSync(banner.path))
      .catch(console.error);
  }
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
        restoreSettings(r, subreddit, JSON.parse(settings));
        restoreUserFlairTemplates(r, subreddit, JSON.parse(flair));
        restoreStylesheet(r, subreddit, stylesheetImagesArray, stylesheet);
        restoreStylesheetImages(r, subreddit, stylesheetImages);
        restoreSubredditImages(r, subreddit, subredditImages);

        // TODO: delete temp files
        // fs.unlinkSync('tmp');
        // console.log('tmp deleted');

        if (!settings || !flair || !stylesheet) {
          throw Error(`${archive} is not a valid subreddit backup`);
        }
      })
      .catch(console.error);
  });
}
