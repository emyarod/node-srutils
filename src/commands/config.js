import readline from 'readline';
import fs from 'fs';

const getCredential = ({ rl, prompt }) =>
  new Promise(resolve => rl.question(prompt, resolve));

export default async function config() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const clientId = await getCredential({
    rl,
    prompt:
      'Enter your reddit client ID (follow these steps to obtain it https://github.com/reddit-archive/reddit/wiki/OAuth2-Quick-Start-Example#first-steps): ',
  });
  const clientSecret = await getCredential({
    rl,
    prompt:
      'Enter your reddit client secret (follow these steps to obtain it https://github.com/reddit-archive/reddit/wiki/OAuth2-Quick-Start-Example#first-steps): ',
  });
  const refreshToken = await getCredential({
    rl,
    prompt:
      'Enter your reddit refresh token (you can generate one here https://not-an-aardvark.github.io/reddit-oauth-helper/). Make sure your token contains the following scopes (flair, modconfig, modflair, mysubreddits, read, structuredstyles): ',
  });
  rl.close();
  fs.writeFileSync(
    `${__dirname}/../../opendoors.json`,
    JSON.stringify({
      clientId,
      clientSecret,
      refreshToken,
    })
  );
}
