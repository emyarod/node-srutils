const resetStylesheet = (r, subreddit) =>
  console.log('Resetting stylesheet...') ||
  r.getSubreddit(subreddit).updateStylesheet({
    css: '',
    reason: 'node-srutils reset',
  });

const clearStylesheetImages = async (r, subreddit) => {
  console.log('Clearing stylesheet images...');
  const stylesheet = await r
    .oauthRequest({
      uri: `/r/${subreddit}/about/stylesheet.json`,
      json: true,
    })
    .catch(({ error: { error, message } }) =>
      console.error(
        `${error} ${message} - This subreddit does not have a custom stylesheet!`
      )
    );
  if (stylesheet && stylesheet.images.length) {
    stylesheet.images.forEach(({ url, name: imageName }) => {
      console.log(`Deleting ${imageName}.${url.split('.').slice(-1)}`);
      r
        .getSubreddit(subreddit)
        .deleteImage({ imageName })
        .catch(console.error);
    });
  }
};

const resetSettings = (r, subreddit) =>
  console.log('Resetting settings...') ||
  r.getSubreddit(subreddit).editSettings({
    title: subreddit,
    public_description: '',
    description: '',
    submit_text: '',
    hide_ads: false,
    lang: 'en',
    type: 'public',
    link_type: 'any',
    submit_link_label: '',
    submit_text_label: '',
    wikimode: 'modonly',
    wiki_edit_karma: 0,
    wiki_edit_age: 0,
    spam_links: 'high',
    spam_selfposts: 'high',
    spam_comments: 'high',
    over_18: false,
    allow_top: true,
    show_media: false,
    show_media_preview: true,
    allow_images: true,
    exclude_banned_modqueue: false,
    public_traffic: false,
    collapse_deleted_comments: false,
    suggested_comment_sort: '',
    spoilers_enabled: false,
  });

const resetFlair = (r, subreddit) => {
  console.log('Configuring default flair options...');
  r.getSubreddit(subreddit).configure_flair({
    userFlairEnabled: true,
    userFlairPosition: 'right',
    userFlairSelfAssignEnabled: false,
    linkFlairPosition: 'none',
    linkFlairSelfAssignEnabled: false,
  });
  console.log('Deleting all user flair templates...');
  r.getSubreddit(subreddit).deleteAllUserFlairTemplates();
  console.log('Deleting all link flair templates...');
  r.getSubreddit(subreddit).deleteAllLinkFlairTemplates();
};

export default function reset(r, subreddit, filterString = 'all') {
  console.log(subreddit, filterString);
  const filters = filterString
    .toLowerCase()
    .split(',')
    .reduce((p, c) => ({ ...p, [c]: true }), {});
  console.log(filters);
  if (filters.all) {
    ['css', 'images', 'header', 'icon', 'banner', 'settings', 'flair'].forEach(
      filter => {
        filters[filter] = true;
      }
    );
  }
  if (filters.css) resetStylesheet(r, subreddit);
  if (filters.images) clearStylesheetImages(r, subreddit);
  if (filters.banner) r.getSubreddit(subreddit).deleteBanner();
  if (filters.header) r.getSubreddit(subreddit).deleteHeader();
  if (filters.icon) r.getSubreddit(subreddit).deleteIcon();
  if (filters.settings) resetSettings(r, subreddit);
  if (filters.flair) resetFlair(r, subreddit);
}
