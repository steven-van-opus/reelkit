// A style's reference video as a test episode, to voice and render it the way a reel in the style is made:
// episodes/_test-style-<id>/episode.json (a test folder: gitignored, delete it when you're done).
//
//   node src/style.mjs                 lists the styles
//   node src/style.mjs <id>            writes the episode; then
//   npm run reel -- --episode episodes/_test-style-<id> --from voice
import fs from 'fs';
import path from 'path';
import { EPISODES } from './pick-news.mjs';
import { STYLES, styleOf } from './styles/index.mjs';
import { referenceEpisode } from './styles/reference.mjs';

const id = process.argv[2];
if (!id) {
  for (const s of Object.values(STYLES)) console.log(`${s.id.padEnd(10)} ${s.name}: ${s.reference.title}`);
  process.exit(0);
}
const style = styleOf(id);
if (!style) {
  console.error(`No style "${id}". Styles: ${Object.keys(STYLES).join(', ')}`);
  process.exit(1);
}
const episode = referenceEpisode(style);
const dir = path.join(EPISODES, episode.id);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'episode.json'), `${JSON.stringify(episode, null, 2)}\n`);
console.log(`${path.relative(process.cwd(), dir)}/episode.json: ${style.name}, ${episode.beats.length} scenes`);
