# node-srutils

## Commands

### reset

Resets a subreddit's settings and stylesheet back to default. You must be a moderator of the subreddit to run this command.

```
node-srutils reset /r/example [filters]
node-srutils reset /r/example            // to completely reset a subreddit to default
node-srutils reset /r/example all        // to completely reset a subreddit to default
node-srutils reset /r/example css,images // to reset stylesheet and stylesheet images
node-srutils reset /r/example flair      // to remove all flair settings and templates
```

The filters allow you to selectively reset parts of the subreddit. Filters may be `all` (by default) to clear all data, or any comma-separated combination of `css`, `images`, `header`, `icon`, `banner`, `settings`, and `flair`.` If no filters are specified, all of the filters will be applied.

### clone

### backup

Creates a zip archive containing a subreddit's settings and styles.

```
node-srutils backup /r/example
```

Includes subreddit stylesheet, images, sidebar content, and flair templates.

### restore

Restores a subreddit's settings and styles from a backup zip archive.

```
node-srutils restore valid_node_srutils_subreddit_backup.zip
```

Includes subreddit stylesheet, images, sidebar content, and flair templates.

## Development

```
$ git clone https://github.com/emyarod/node-srutils.git
$ cd node-srutils
$ npm install
$ NODE_ENV=dev node bin/cli.js <command>
```
