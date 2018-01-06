# node-srutils

## Commands

### reset

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
