export const createUserFlairTemplates = (r, subreddit, userFlairTemplates) =>
  userFlairTemplates.forEach(
    ({
      flair_text: text,
      flair_css_class: cssClass,
      flair_text_editable: textEditable,
    }) =>
      r
        .getSubreddit(subreddit)
        .createUserFlairTemplate({
          text,
          cssClass,
          textEditable,
        })
        .catch(console.error)
  );
export const editSettings = (r, subreddit, settings) =>
  r
    .getSubreddit(subreddit)
    // https://github.com/not-an-aardvark/snoowrap/issues/126#issuecomment-355722120
    .editSettings({ ...settings, type: settings.subreddit_type })
    .catch(console.error);
export const updateStylesheet = (
  r,
  subreddit,
  stylesheetImagesArray,
  stylesheet,
  reason
) => {
  /**
   * Replace stylesheet image URL with reddit percent formatted URLs
   * https://stackoverflow.com/a/10726800
   */
  const replacementMap = stylesheetImagesArray.reduce(
    (p, c) => ({
      ...p,
      [`url("${c.url.replace(/(https|http):/, '')}")`]: c.link,
    }),
    {}
  );
  const regex = new RegExp(
    Object.keys(replacementMap)
      .map(e => e.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&'))
      .join('|'),
    'g'
  );
  console.log(`${reason}...`);
  return r
    .getSubreddit(subreddit)
    .updateStylesheet({
      css: stylesheet.replace(regex, match => replacementMap[match]),
      reason: `node-srutils - ${reason}`,
    })
    .catch(console.error);
};
