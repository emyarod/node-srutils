import fs from 'fs';
import archiver from 'archiver';

export default function backup(files, subreddit) {
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
}
