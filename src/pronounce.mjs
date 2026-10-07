// What the narrator should actually say. Scripts are written for the eye
// ("TOOLBOX", "4K", "Cmd+Enter", "8:1"); TTS models read some of that badly
// (spelling out all-caps words, Frenchifying "Cursor's"). This turns display
// text into speakable text; captions keep the written form.

// Names the voice actually gets wrong (checked by transcribing the reels),
// respelled the way they're said. Add to it when a read-back shows a miss.
export const LEXICON = {
  Vercel: 'Ver-sell',
  Cursor: 'Curser',
  "Cursor's": "Curser's",
  Supabase: 'Soopa-base',
  ElevenLabs: 'Eleven Labs',
  CTA: 'call to action',
  CTAs: 'calls to action',
  'Cmd+Enter': 'Command Enter',
  'Ctrl+Enter': 'Control Enter',
};

// All-caps words that really are spelled out; anything else in caps is a word
// written loudly ("TOOLBOX") and should be read as one.
const ACRONYMS = new Set(['AI', 'API', 'APIs', 'UI', 'UX', 'iOS', 'GPT', 'SDK', 'CLI', 'URL', 'PDF', 'SVG', 'MCP', 'LLM', 'GA', 'CEO', 'OK', 'TV', 'US', 'UK']);

const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const say = n => (Number(n) <= 12 ? NUM[Number(n)] : String(n));

export function speakable(text) {
  let s = String(text);
  // Ratios and resolutions: 8:1 → eight to one, 16:9 → sixteen by nine, 4K → four K.
  s = s.replace(/\b(\d{1,2}):(\d{1,2})\b/g, (_, a, b) => `${say(a)} ${Number(a) > Number(b) || b === '1' ? 'to' : 'by'} ${say(b)}`);
  s = s.replace(/\b(\d{1,2})K\b/g, (_, a) => `${say(a)} K`);
  // Version numbers: 2.1 → two point one (but leave prices and longer decimals alone).
  s = s.replace(/(?<![\d$.])(\d{1,2})\.(\d)(?![\d%])/g, (_, a, b) => `${say(a)} point ${say(b)}`);
  // Lexicon, longest keys first, whole words only.
  for (const key of Object.keys(LEXICON).sort((a, b) => b.length - a.length)) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp(`(?<![\\w-])${esc}(?![\\w-])`, 'g'), LEXICON[key]);
  }
  // Loud words: TOOLBOX → Toolbox.
  s = s.replace(/\b[A-Z]{4,}\b/g, w => (ACRONYMS.has(w) ? w : w[0] + w.slice(1).toLowerCase()));
  return s;
}
