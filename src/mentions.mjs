// Finds real products named in the voiceover so their logo can ride along in
// the caption chip ("Slack", "Nano Banana", "ChatGPT"). Names come from the
// product titles in the catalog plus a few aliases for things that aren't
// tools in their own right (models, product lines).
import { productIndex as allTools } from './catalog.mjs';

// name → toolId for products that live under another tool's entry.
export const ALIASES = {
  'Nano Banana': 'gemini',
  'Nano Banana Pro': 'gemini',
  Gemini: 'gemini',
  'Gemini API': 'gemini',
  Veo: 'gemini',
  Claude: 'claude',
  'Claude Code': 'claude-code',
  GPT: 'chatgpt',
  Codex: 'openai-codex',
  'AI Gateway': 'vercel',
};

// Single words that are tool titles but read as ordinary English.
const COMMON = new Set(['Muse', 'Harvey', 'Keeper', 'Linear', 'Stanley', 'Fathom', 'Phi', 'Rank', 'Notes', 'Canvas',
  'Remote', 'Agent', 'Albums', 'Studio', 'Frame', 'Flow', 'Spline', 'Arc', 'Craft', 'Pitch', 'Loom', 'Rive', 'Mode']);

let index = null;
function buildIndex() {
  if (index) return index;
  index = new Map(); // lowercased name → { toolId, words, title }
  const add = (name, toolId, trusted = false) => {
    if (!name || !toolId) return;
    const words = name.trim().split(/\s+/);
    const key = words.join(' ').toLowerCase();
    if (!index.has(key)) index.set(key, { toolId, words, name, trusted });
  };
  for (const [name, id] of Object.entries(ALIASES)) add(name, id, true);
  for (const t of allTools().values()) {
    if (!t.title || t.title.length < 3) continue;
    const single = !/\s/.test(t.title);
    const innerCap = /[a-z][A-Z]/.test(t.title);
    if (single && COMMON.has(t.title)) continue;
    // One-word names only for well-known tools or distinctive camel-case brands.
    if (single && !innerCap && (t.popularity ?? 0) < 90) continue;
    add(t.title, t.id, innerCap);
  }
  return index;
}

const bare = w => String(w).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.+]+$/gu, '').replace(/\.$/, '');

// words: [{ text, start, end }] for one beat. Returns Map(wordIndex → { toolId, span, name }).
export function findMentions(words, { subjectToolId = null, explicit = null, exclude = [] } = {}) {
  const idx = buildIndex();
  // The episode's own tool always counts, however popular it is ("Higgsfield's"
  // in a Higgsfield reel), as long as its name is spoken capitalised.
  const subject = subjectToolId ? allTools().get(subjectToolId) : null;
  const subjectKey = subject?.title ? subject.title.trim().split(/\s+/).join(' ').toLowerCase() : null;
  const lookup = key => idx.get(key) || (key === subjectKey ? { toolId: subjectToolId, words: subject.title.split(/\s+/), name: subject.title, trusted: true } : null);
  const found = new Map();
  const maxSpan = 4;
  for (let i = 0; i < words.length; i++) {
    for (let span = Math.min(maxSpan, words.length - i); span >= 1; span--) {
      const parts = words.slice(i, i + span).map(w => bare(w.text));
      if (!parts.every(Boolean)) continue;
      // Possessives ("Figma's") still count.
      parts[span - 1] = parts[span - 1].replace(/['’]s$/, '');
      const hit = lookup(parts.join(' ').toLowerCase());
      if (!hit) continue;
      // Proper nouns only: the spoken form must be capitalised like the name.
      if (!/^[A-Z0-9]/.test(parts[0])) continue;
      const sentenceStart = i === 0 || /[.!?]$/.test(words[i - 1].text);
      if (span === 1 && sentenceStart && !hit.trusted && hit.toolId !== subjectToolId) continue;
      if (exclude.includes(hit.toolId)) continue;
      found.set(i, { toolId: hit.toolId, span, name: hit.name });
      i += span - 1;
      break;
    }
  }
  if (Array.isArray(explicit)) {
    // A beat can pin logos by name/toolId: "logos": ["slack"] — shown on the
    // first word that matches the tool's name, else on the first word.
    for (const id of explicit) {
      if ([...found.values()].some(m => m.toolId === id)) continue;
      const tool = allTools().get(id);
      const first = tool?.title?.split(/\s+/)[0]?.toLowerCase();
      const at = words.findIndex(w => bare(w.text).toLowerCase() === first);
      found.set(at >= 0 ? at : 0, { toolId: id, span: 1, name: tool?.title || id });
    }
  }
  return found;
}

// Tool ids mentioned anywhere in an episode's voiceover (for preloading logos).
export function mentionedToolIds(episode) {
  const ids = new Set();
  for (const beat of episode.beats || []) {
    const words = String(beat.vo || '').split(/\s+/).filter(Boolean).map(text => ({ text }));
    const explicit = Array.isArray(beat.logos) ? beat.logos : null;
    for (const m of findMentions(words, { subjectToolId: episode.source?.toolId, explicit }).values()) ids.add(m.toolId);
  }
  return [...ids];
}
