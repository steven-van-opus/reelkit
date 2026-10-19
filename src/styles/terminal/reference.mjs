// Terminal's reference video (../index.mjs `reference`): webhooks explained against the clock, eight scenes in one
// story, each a different Terminal move (the name slammed over a two-pane flow, a terminal spamming polls cut by a
// reaction card, an editor typing a route, curl against a server log, a request inspector, a diagram, two lines of
// code swapped against a ring timer, the recap as the clock hits zero). The facts: an Express route with
// express.json() and res.sendStatus(200) (which answers "OK"), curl's --json flag (curl 7.82 and later), the headers
// GitHub sends with a delivery (X-GitHub-Event, and X-Hub-Signature-256: an HMAC-SHA256 of the body with the secret
// you share, prefixed "sha256="), and GitHub treating a delivery as failed when no 2XX comes back within ten seconds.
// The signature's hex is illustrative, cut short with an ellipsis.
//
// Every scene carries the same top bar (topBar: the dot grid, the "> speedrun webhooks" prompt line and the countdown
// chip over a clock bar that drains across the whole video, from 00:45 to 00:00), opens on a two-frame glitch
// (GLITCH, and the content jolted `j` px) and defines what it draws itself: Pane (a floating pane with its hard accent
// shadow) and, where code types in, Code. Each scene's code stands alone, so the writer can copy any one. Every scene
// names its own place, a new one wherever the line moves on. Bump `id` whenever the video changes.

/**
 * The clock every scene starts from: `run` (how much of the video has played, 0–1, scene `n` of `of` taking an equal
 * share), `clock` (the whole seconds left of `total`, reaching 0 in the last line's final second) and `j` (the glitch's jolt).
 */
export const clockOf = (n, of, total) => `const run = (${n} + clamp(time / duration)) / ${of}, clock = Math.floor(${total} * (1 - run)), j = time < 0.06 ? 14 : 0;`;

/** The top bar every scene carries: the wall's dot grid, the prompt line, the countdown chip and the draining clock bar. */
export const topBar = (topic) => String.raw`<g stroke={colors.ink} strokeOpacity={0.1} strokeWidth={5} strokeLinecap="round" strokeDasharray="1 59">{range(32).map(i => <line x1={30} y1={30 + i * 60} x2={1080} y2={30 + i * 60}/>)}</g>
    <text fontFamily="mono" x={60} y={304} fontSize={36} fontWeight={700} fill={colors.ink} fillOpacity={0.6}><tspan fill={colors.accent} fillOpacity={1}>{'> '}</tspan>speedrun ${topic}</text>
    <rect x={776} y={258} width={184} height={62} rx={8} fill={colors.floor} stroke={colors.accent} strokeWidth={3}/>
    <circle cx={806} cy={289} r={8} fill={colors.accent}/>
    <text fontFamily="mono" x={940} y={304} textAnchor="end" fontSize={40} fontWeight={700} fill={colors.ink}>{'0' + Math.floor(clock / 60) + ':' + (clock % 60 < 10 ? '0' : '') + clock % 60}</text>
    <line x1={60} y1={352} x2={960} y2={352} stroke={colors.ink} strokeOpacity={0.14} strokeWidth={4}/>
    <line x1={60} y1={352} x2={60 + 900 * (1 - run)} y2={352} stroke={colors.accent} strokeWidth={4}/>`;

/** The two-frame glitch a scene opens on: a slice of the accent and one of rose across the frame (over the jolted content). */
export const GLITCH = String.raw`{time < 0.06 ? <g><rect x={0} y={604} width={1080} height={24} fill={colors.accent}/><rect x={0} y={1026} width={1080} height={14} fill={colors.rose}/></g> : null}`;

/** A floating pane: a hard accent shadow, a colors.floor body, three dots and the file's tab; it slides up 80 px as `a` goes 0 → 1. */
export const PANE = String.raw`const Pane = ({ x, y, w, h, file, a, tilt, children }) => <g opacity={a} transform={'translate(0 ' + 80 * (1 - a) + ') rotate(' + tilt + ' ' + (x + w / 2) + ' ' + (y + h / 2) + ')'}>
    <rect x={x + 14} y={y + 14} width={w} height={h} rx={14} fill={colors.accent}/>
    <rect x={x} y={y} width={w} height={h} rx={14} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.25} strokeWidth={3}/>
    <line x1={x} y1={y + 66} x2={x + w} y2={y + 66} stroke={colors.ink} strokeOpacity={0.18} strokeWidth={2}/>
    {range(3).map(i => <circle cx={x + 36 + i * 28} cy={y + 33} r={8} fill={colors.ink} fillOpacity={0.3}/>)}
    <text fontFamily="mono" x={x + 128} y={y + 45} fontSize={34} fill={colors.ink} fillOpacity={0.7}>{file}</text>
    <line x1={x + 122} y1={y + 64} x2={x + 134 + file.length * 20.4} y2={y + 64} stroke={colors.accent} strokeWidth={4}/>
    {children}
  </g>;`;

/**
 * Code that types itself in: `src` rows are [indent, [[text, kind], …]] (kind 'k' a keyword in the accent, 's' a string
 * in rose, 'n' a name, in ink like none: never a tint derived from the brand, which a light kit leaves unreadable),
 * `typed` how many characters are in so far, `bar` the row on the accent bar (−1 for none; a fraction slides it between
 * rows). The reveal steps 0.6 em a character, the mono advance of most system faces; a typed row's clip runs two
 * characters past its end, so a wider face (SF Mono's 0.62) never cuts its last glyph.
 */
export const CODE = String.raw`const C = { k: colors.accent, s: colors.rose, n: colors.ink };
  const flat = l => l[1].map(t => t[0]).join('');
  const Code = ({ src, x, y, w, size, lh, typed, bar }) => {
    const cw = size * 0.6;
    const rows = src.map((l, i) => ({ i, x: x + l[0] * 2 * cw, y: y + i * lh, len: flat(l).length, at: src.slice(0, i).map(flat).join('').length }));
    const live = rows.filter(r => typed < r.at + r.len), cur = live.length ? live[0] : rows[rows.length - 1];
    return <g>
      <g opacity={bar < 0 ? 0 : 1}><rect x={x - 106} y={y + bar * lh - size - 6} width={w - x + 102} height={lh} fill={colors.accent} fillOpacity={0.16}/><rect x={x - 106} y={y + bar * lh - size - 6} width={6} height={lh} fill={colors.accent}/></g>
      {rows.map(r => <text fontFamily="mono" x={x - 28} y={r.y} textAnchor="end" fontSize={34} fill={colors.ink} fillOpacity={typed < r.at ? 0 : 0.35}>{r.i + 1}</text>)}
      {rows.map(r => <clipPath id={'t' + r.i}><rect x={r.x - 4} y={r.y - size - 6} width={4 + (typed < r.at + r.len ? clamp(typed - r.at, 0, r.len) : r.len + 2) * cw} height={lh}/></clipPath>)}
      {rows.map(r => <text clipPath={'url(#t' + r.i + ')'} fontFamily="mono" x={r.x} y={r.y} fontSize={size} fill={colors.ink}>{src[r.i][1].map(t => <tspan fill={t[1] ? C[t[1]] : colors.ink}>{t[0]}</tspan>)}</text>)}
      <rect x={cur.x + 2 + clamp(typed - cur.at, 0, cur.len) * cw} y={cur.y - size + 2} width={size * 0.55} height={size + 4} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
    </g>;
  };`;

const N = 8, TOTAL = 45;
const head = (n) => clockOf(n, N, TOTAL);
const TOP = topBar('webhooks');

export const TERMINAL_REFERENCE = {
  id: 'terminal-1',
  title: 'Webhooks, against the clock',
  // Its full-width panes and reaction cards (x 60–960) are the style's own at any height, never a set to copy.
  ownColumns: [{ x: 60, w: 900 }],
  caption: 'What a webhook is, how to catch one, and the two rules that keep it working.',
  beats: [
    {
      label: 'Webhooks, against the clock',
      line: 'A webhook is an HTTP POST another app sends to your URL the moment something happens.',
      place: 'a title card: WEBHOOKS stamped over a two-app flow',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(0)}
  const slam = clamp(time / 0.3), s = 1 + 0.2 * (1 - easeOutBack(slam));
  const a = easeOut(clamp((time - 0.3) / 0.25)), b = easeOut(clamp((time - 0.45) / 0.25));
  const hits = [at('POST'), at('moment'), at('happens')], evs = ['issue opened', 'push', 'star added'];
  const zero = easeOut(clamp((time - at('happens')) / 0.4)), done = hits.filter(h => time > h + 0.45).length;
  ${PANE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <text fontFamily="mono" x={60} y={436} fontSize={34} fill={colors.ink} fillOpacity={0.5} opacity={a}>{'// webhook (noun)'}</text>
      {[[colors.rose, -10], [colors.accent, 10], [colors.ink, 0]].map((c, i) => <text x={510 + c[1] * (1 - slam)} y={600} textAnchor="middle" fontSize={150 * s} fontWeight={900} letterSpacing={-4} fill={c[0]} opacity={i < 2 ? 1 - slam : clamp(time / 0.06)}>WEBHOOKS</text>)}
      <Pane x={60} y={690} w={360} h={330} file="their app" a={a} tilt={-2}>
        {evs.map((e, i) => <g opacity={time > hits[i] ? 1 : 0.35}>
          <circle cx={98} cy={800 + i * 72} r={10} fill={time > hits[i] ? colors.accent : colors.ink}/>
          <text fontFamily="mono" x={124} y={812 + i * 72} fontSize={34} fill={colors.ink}>{e}</text>
        </g>)}
      </Pane>
      <Pane x={560} y={690} w={400} h={560} file="your server" a={b} tilt={1.5}>
        <text fontFamily="mono" x={590} y={812} fontSize={34} fill={colors.ink} fillOpacity={0.6}><tspan fill={colors.accent} fillOpacity={1}>$ </tspan>node server.js</text>
        {hits.map((h, i) => <text fontFamily="mono" x={590} y={884 + i * 64} fontSize={34} fill={colors.ink} opacity={time > h + 0.45 ? 1 : 0}><tspan fill={colors.accent}>POST</tspan> /hooks <tspan fill={colors.rose}>200</tspan></text>)}
        <rect x={590} y={852 + done * 64} width={20} height={40} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
      </Pane>
      <g opacity={a}>
        <text fontFamily="mono" x={490} y={772} textAnchor="middle" fontSize={34} fontWeight={700} fill={colors.accent}>POST</text>
        <path d="M 432 850 C 470 812 512 812 548 850" fill="none" stroke={colors.accent} strokeWidth={4} strokeDasharray="10 10" strokeDashoffset={-time * 60}/>
        <polyline points="530,836 550,852 528,864" fill="none" stroke={colors.accent} strokeWidth={4}/>
      </g>
      {hits.map((h, i) => { const p = clamp((time - h) / 0.45); return p > 0 && p < 1 ? <g transform={'translate(' + (400 + 200 * p) + ' ' + (800 + i * 72 + (72 - i * 8) * p - 90 * Math.sin(p * 3.1416)) + ')'}>
        <rect x={-48} y={-28} width={96} height={56} rx={8} fill={colors.chalk}/>
        <text fontFamily="mono" x={0} y={12} textAnchor="middle" fontSize={34} fontWeight={700} fill={colors.cardInk}>{'{ }'}</text>
      </g> : null; })}
      <g opacity={zero}>
        <text fontFamily="mono" x={60} y={1112} fontSize={34} fill={colors.ink} fillOpacity={0.55}>POLLS SENT</text>
        <text fontFamily="mono" x={56} y={1238} fontSize={110} fontWeight={700} fill={colors.accent}>0</text>
        <text fontFamily="mono" x={150} y={1236} fontSize={34} fill={colors.ink} fillOpacity={0.55}>it just arrives</text>
      </g>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'Polling: asking again and again',
      line: 'Without one, you poll: ask the API every few seconds if anything changed. It almost never has.',
      place: 'a terminal spamming GET requests, every answer empty',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(1)}
  const a = easeOut(clamp(time / 0.25)), typed = (time - 0.25) * 45;
  const cmd = [['$ ', 'while sleep 5; do'], ['> ', 'curl -s localhost:3000/events'], ['> ', 'done']];
  const before = [0, 17, 46], row = typed < 17 ? 0 : typed < 46 ? 1 : 2;
  const n = Math.max(0, Math.floor((time - at('ask')) / 0.3)), shown = Math.min(n, 5);
  const v = clamp((time - at('never')) / 0.3), s = 1 + 0.25 * (1 - easeOutBack(v));
  ${PANE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'} opacity={1 - 0.7 * easeOut(v)}>
      <Pane x={60} y={392} w={900} h={640} file="zsh: polling" a={a} tilt={-1}>
        {cmd.map((c, i) => <g>
          <clipPath id={'c' + i}><rect x={96} y={474 + i * 54} width={clamp(typed - before[i], 0, 40) * 20.4 + 46} height={54}/></clipPath>
          <text clipPath={'url(#c' + i + ')'} fontFamily="mono" x={100} y={516 + i * 54} fontSize={34} fill={colors.ink}><tspan fill={colors.accent}>{c[0]}</tspan>{c[1]}</text>
        </g>)}
        {range(shown).map(i => <text fontFamily="mono" x={100} y={700 + i * 54} fontSize={34} fill={colors.ink} fillOpacity={0.4 + 0.15 * i}>{'[]'}</text>)}
        <rect x={shown ? 100 : 144 + clamp(typed - before[row], 0, 29) * 20.4} y={shown ? 670 + shown * 54 : 484 + row * 54} width={20} height={40} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
      </Pane>
      <text fontFamily="mono" x={60} y={1110} fontSize={34} fill={colors.ink} fillOpacity={0.55}>REQUESTS</text>
      <text fontFamily="mono" x={56} y={1236} fontSize={110} fontWeight={700} fill={colors.ink}>{n}</text>
      <text fontFamily="mono" x={560} y={1110} fontSize={34} fill={colors.ink} fillOpacity={0.55}>CHANGES</text>
      <text fontFamily="mono" x={556} y={1236} fontSize={110} fontWeight={700} fill={colors.accent}>0</text>
    </g>
    <g opacity={clamp(v * 4)} transform={'rotate(-4 510 760) matrix(' + s + ' 0 0 ' + s + ' ' + 510 * (1 - s) + ' ' + 760 * (1 - s) + ')'}>
      <rect x={100} y={575} width={820} height={360} rx={10} fill={colors.wall} stroke={colors.rose} strokeWidth={6}/>
      <text x={510} y={718} textAnchor="middle" fontSize={130} fontWeight={900} letterSpacing={-3} fill={colors.rose}>STILL</text>
      <text x={510} y={870} textAnchor="middle" fontSize={130} fontWeight={900} letterSpacing={-3} fill={colors.rose}>NOTHING.</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'One route catches every event',
      line: 'With a webhook, you hand them a URL instead, and one route catches every event as it lands.',
      place: 'an editor on server.js: an Express POST route',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(2)}
  const a = easeOut(clamp(time / 0.25)), f = easeOut(clamp((time - at('URL') + 0.3) / 0.25));
  const url = 'https://example.com/hooks', u = clamp((time - at('URL')) * 45, 0, url.length);
  const bar = time < at('route') ? -1 : 3 + 2 * easeOut(clamp((time - at('lands')) / 0.2));
  const src = [
    [0, [['const ', 'k'], ['express = '], ['require', 'n'], ['('], ["'express'", 's'], [');']]],
    [0, [['const ', 'k'], ['app = '], ['express', 'n'], ['();']]],
    [0, []],
    [0, [['app.'], ['post', 'n'], ['('], ["'/hooks'", 's'], [', express.'], ['json', 'n'], ['(),']]],
    [1, [['(req, res) '], ['=>', 'k'], [' {']]],
    [2, [['console.'], ['log', 'n'], ['(req.body.action);']]],
    [2, [['res.'], ['sendStatus', 'n'], ['('], ['200', 'k'], [');']]],
    [1, [['});']]],
    [0, [['app.'], ['listen', 'n'], ['('], ['3000', 'k'], [');']]],
  ];
  ${PANE}
  ${CODE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <Pane x={60} y={392} w={900} h={620} file="server.js" a={a} tilt={-1}>
        <Code src={src} x={170} y={508} w={960} size={36} lh={53} typed={(time - 0.25) * 45} bar={bar}/>
      </Pane>
      <g opacity={f} transform={'translate(0 ' + 40 * (1 - f) + ')'}>
        <text fontFamily="mono" x={60} y={1100} fontSize={34} fill={colors.ink} fillOpacity={0.55}>PAYLOAD URL</text>
        <rect x={60} y={1126} width={900} height={92} rx={10} fill={colors.floor} stroke={colors.accent} strokeWidth={3}/>
        <clipPath id="u"><rect x={84} y={1130} width={(u < url.length ? u : u + 2) * 22.8 + 4} height={84}/></clipPath>
        <text clipPath="url(#u)" fontFamily="mono" x={88} y={1186} fontSize={38} fill={colors.ink}>{url}</text>
        <rect x={92 + u * 22.8} y={1150} width={20} height={44} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
      </g>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'Fake one with curl',
      line: 'Fake one yourself with curl. Your server logs the event, and curl prints OK.',
      place: 'a terminal running curl above the server log',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(3)}
  const a = easeOut(clamp(time / 0.25)), b = easeOut(clamp((time - 0.15) / 0.25)), typed = (time - 0.25) * 45;
  const cmd = ['curl localhost:3000/hooks \\', "  --json '{\"action\":\"opened\"}'"];
  const logged = time > at('logs'), ok = time > at('OK'), row = ok ? 2 : typed < 28 ? 0 : 1;
  const p = clamp((time - at('logs') + 0.45) / 0.45), k = easeOutBack(clamp((time - at('OK')) / 0.3));
  ${PANE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <Pane x={60} y={392} w={900} h={380} file="zsh" a={a} tilt={-1.5}>
        {cmd.map((c, i) => <g>
          <clipPath id={'c' + i}><rect x={136} y={472 + i * 56} width={clamp(typed - i * 28, 0, 33) * 20.4 + 4} height={56}/></clipPath>
          <text fontFamily="mono" x={100} y={514 + i * 56} fontSize={34} fill={colors.accent}>{i ? '' : '$'}</text>
          <text clipPath={'url(#c' + i + ')'} fontFamily="mono" x={140} y={514 + i * 56} fontSize={34} fill={colors.ink}>{c}</text>
        </g>)}
        <text fontFamily="mono" x={100} y={626} fontSize={34 + 12 * (1 - k)} fontWeight={700} fill={colors.accent} opacity={ok ? 1 : 0}>OK</text>
        <rect x={ok ? 160 : 144 + clamp(typed - row * 28, 0, 31) * 20.4} y={482 + row * 56} width={20} height={40} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
      </Pane>
      <Pane x={60} y={850} w={900} h={380} file="node server.js" a={b} tilt={1.5}>
        <text fontFamily="mono" x={100} y={972} fontSize={34} fill={colors.ink} fillOpacity={0.45}><tspan fill={colors.accent} fillOpacity={1}>$ </tspan>node server.js</text>
        <g opacity={logged ? 1 : 0}>
          <rect x={64} y={1000} width={892} height={56} fill={colors.accent} fillOpacity={0.16}/>
          <rect x={64} y={1000} width={6} height={56} fill={colors.accent}/>
          <text fontFamily="mono" x={100} y={1040} fontSize={34} fill={colors.rose}>opened</text>
          <text fontFamily="mono" x={920} y={1040} textAnchor="end" fontSize={34} fill={colors.ink} fillOpacity={0.45}>{'// req.body.action'}</text>
        </g>
      </Pane>
      {p > 0 && p < 1 ? <g transform={'translate(' + (300 + 200 * p) + ' ' + (700 + 330 * p) + ')'}>
        <rect x={-48} y={-28} width={96} height={56} rx={8} fill={colors.chalk}/>
        <text fontFamily="mono" x={0} y={12} textAnchor="middle" fontSize={34} fontWeight={700} fill={colors.cardInk}>{'{ }'}</text>
      </g> : null}
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'What a delivery looks like',
      line: 'Each delivery is a JSON body, plus headers that name the event and carry a signature.',
      place: 'a request inspector: one delivery, raw',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(4)}
  const a = easeOut(clamp(time / 0.25));
  const rows = [
    [['POST', 'k'], [' /hooks HTTP/1.1']],
    [['Content-Type:', 'k'], [' application/json']],
    [['X-GitHub-Event:', 'k'], [' issues']],
    [['X-Hub-Signature-256:', 'k'], [' sha256=9f2c41…']],
    [],
    [['{']],
    [['  "action"', 'k'], [': '], ['"opened"', 's'], [',']],
    [['  "issue"', 'k'], [': { '], ['"number"', 'k'], [': 42 }']],
    [['}']],
  ];
  const C = { k: colors.accent, s: colors.rose };
  const marks = [[at('body'), 5, 4], [at('headers'), 1, 3], [at('event'), 2, 1], [at('signature'), 3, 1]];
  const on = marks.filter(q => time > q[0]), m = on.length ? on[on.length - 1] : null;
  const e = easeOutBack(clamp((time - at('event')) / 0.3)), g = easeOutBack(clamp((time - at('signature')) / 0.3));
  ${PANE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <Pane x={60} y={392} w={900} h={600} file="request.http" a={a} tilt={-1}>
        {m ? <g><rect x={64} y={470 + m[1] * 52} width={892} height={m[2] * 52} fill={colors.accent} fillOpacity={0.16}/><rect x={64} y={470 + m[1] * 52} width={6} height={m[2] * 52} fill={colors.accent}/></g> : null}
        {rows.map((r, i) => <text fontFamily="mono" x={100} y={510 + i * 52} fontSize={34} fill={colors.ink} opacity={time > 0.2 + i * 0.07 ? 1 : 0}>{r.map(t => <tspan fill={t[1] ? C[t[1]] : colors.ink}>{t[0]}</tspan>)}</text>)}
      </Pane>
      <g opacity={clamp(e)} transform={'matrix(' + e + ' 0 0 ' + e + ' ' + 280 * (1 - e) + ' ' + 1150 * (1 - e) + ')'}>
        <rect x={60} y={1070} width={430} height={170} rx={10} fill={colors.chalk}/>
        <text fontFamily="mono" x={90} y={1126} fontSize={34} fill={colors.cardInk} fillOpacity={0.6}>WHICH EVENT</text>
        <text fontFamily="mono" x={90} y={1198} fontSize={44} fontWeight={700} fill={colors.cardInk}>issues</text>
      </g>
      <g opacity={clamp(g)} transform={'matrix(' + g + ' 0 0 ' + g + ' ' + 745 * (1 - g) + ' ' + 1150 * (1 - g) + ')'}>
        <rect x={530} y={1070} width={430} height={170} rx={10} fill={colors.chalk}/>
        <text fontFamily="mono" x={560} y={1126} fontSize={34} fill={colors.cardInk} fillOpacity={0.6}>WHO SENT IT</text>
        <text fontFamily="mono" x={560} y={1198} fontSize={44} fontWeight={700} fill={colors.cardInk}>HMAC-SHA256</text>
      </g>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'Check the signature',
      line: 'Anyone can post to that URL, so hash the raw body with your shared secret and check it matches.',
      place: 'a flow: body and secret hashed, then compared',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(5)}
  const in1 = easeOut(clamp((time - at('body')) / 0.25)), in2 = easeOut(clamp((time - at('secret')) / 0.25));
  const fake = easeOutBack(clamp((time - at('Anyone')) / 0.3)), hash = clamp((time - at('hash')) / 0.6);
  const sum = 'sha256=9f2c41…', got = clamp((time - at('hash') - 0.3) * 30, 0, sum.length);
  const hit = time > at('matches'), ok = easeOutBack(clamp((time - at('matches')) / 0.35)), scan = clamp((time - at('matches') + 0.3) / 0.4);
  const Chip = ({ x, label, value, a }) => <g opacity={a} transform={'translate(0 ' + 50 * (1 - a) + ')'}>
    <rect x={x} y={390} width={430} height={150} rx={10} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={3}/>
    <text fontFamily="mono" x={x + 28} y={444} fontSize={34} fill={colors.ink} fillOpacity={0.55}>{label}</text>
    <text fontFamily="mono" x={x + 28} y={508} fontSize={40} fontWeight={700} fill={colors.rose}>{value}</text>
  </g>;
  const Card = ({ x, c, k, tilt, kicker, big }) => <g opacity={clamp(k * 3)} transform={'rotate(' + tilt + ' ' + (x + 215) + ' 1150) matrix(' + k + ' 0 0 ' + k + ' ' + (x + 215) * (1 - k) + ' ' + 1150 * (1 - k) + ')'}>
    <rect x={x} y={1060} width={430} height={180} rx={10} fill={colors.wall} stroke={c} strokeWidth={5}/>
    <text fontFamily="mono" x={x + 30} y={1118} fontSize={34} fill={c}>{kicker}</text>
    <text x={x + 30} y={1212} fontSize={84} fontWeight={900} fill={c}>{big}</text>
  </g>;
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <Chip x={60} label="RAW BODY" value={'{"action":…}'} a={in1}/>
      <Chip x={530} label="SHARED SECRET" value="••••••••" a={in2}/>
      <path d="M 275 540 C 275 590 400 590 440 620 M 745 540 C 745 590 620 590 580 620" fill="none" stroke={colors.accent} strokeWidth={4} strokeDasharray="8 10" strokeDashoffset={-time * 60} opacity={in2}/>
      <g opacity={in2}>
        <rect x={260} y={620} width={500} height={120} rx={12} fill={colors.accent} fillOpacity={0.12 + 0.8 * hash * (1 - hash)} stroke={colors.accent} strokeWidth={4}/>
        <text fontFamily="mono" x={510} y={696} textAnchor="middle" fontSize={44} fontWeight={700} fill={colors.ink}>HMAC-SHA256</text>
      </g>
      <g opacity={hash}>
        <line x1={510} y1={740} x2={510} y2={800} stroke={colors.accent} strokeWidth={4}/>
        <rect x={60} y={814} width={900 * scan} height={150} fill={colors.blush} fillOpacity={0.14}/>
        <text fontFamily="mono" x={60} y={868} fontSize={34} fill={colors.ink} fillOpacity={0.55}>YOURS</text>
        <clipPath id="y"><rect x={296} y={826} width={4 + (got < sum.length ? got : got + 2) * 24} height={56}/></clipPath>
        <text clipPath="url(#y)" fontFamily="mono" x={300} y={868} fontSize={40} fontWeight={700} fill={colors.accent}>{sum}</text>
        <text fontFamily="mono" x={60} y={938} fontSize={34} fill={colors.ink} fillOpacity={0.55}>THEIRS</text>
        <text fontFamily="mono" x={300} y={938} fontSize={40} fontWeight={700} fill={colors.ink}>{sum}</text>
        <text x={900} y={924} textAnchor="middle" fontSize={96} fontWeight={900} fill={colors.accent} opacity={hit ? 1 : 0}>=</text>
      </g>
      <Card x={530} c={colors.rose} k={fake} tilt={4} kicker="A STRANGER" big={hit ? '401' : '???'}/>
      <Card x={60} c={colors.accent} k={ok} tilt={-4} kicker="THE REAL ONE" big="200"/>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: 'Answer within ten seconds',
      line: 'The catch: GitHub gives up after ten seconds, so reply with 200 first and do the slow work after.',
      place: 'a ten-second ring under a handler that answers late',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(6)}
  const a = easeOut(clamp(time / 0.25)), sw = easeInOut(clamp((time - at('reply')) / 0.4)), fixed = time > at('reply') + 0.4;
  const e = fixed ? 0.2 * clamp((time - at('reply') - 0.4) / 0.3) : 10 * clamp((time - 0.3) / (at('ten') + 0.2)), late = !fixed && e >= 10;
  const t = easeOutBack(clamp((time - at('ten') - 0.5) / 0.3)), d = 2 * 3.1416 * 130;
  const C = { k: colors.accent, s: colors.rose, n: colors.ink };
  const rows = [
    [0, 0, [['app.'], ['post', 'n'], ['('], ["'/hooks'", 's'], [', express.'], ['json', 'n'], ['(),']]],
    [1, 1, [['async ', 'k'], ['(req, res) '], ['=>', 'k'], [' {']]],
    [2, 2 + sw, [['await ', 'k'], ['sendReport', 'n'], ['(req.body);']]],
    [2, 3 - sw, [['res.'], ['sendStatus', 'n'], ['('], ['200', 'k'], [');']]],
    [1, 4, [['});']]],
  ];
  const bar = fixed ? 2 + clamp((time - at('slow')) / 0.2) : 2;
  ${PANE}
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <Pane x={60} y={392} w={900} h={420} file="server.js" a={a} tilt={1}>
        <rect x={64} y={466 + bar * 56} width={892} height={56} fill={fixed && time < at('slow') ? colors.accent : colors.rose} fillOpacity={0.16}/>
        <rect x={64} y={466 + bar * 56} width={6} height={56} fill={fixed && time < at('slow') ? colors.accent : colors.rose}/>
        {range(5).map(i => <text fontFamily="mono" x={142} y={508 + i * 56} textAnchor="end" fontSize={34} fill={colors.ink} fillOpacity={0.35}>{i + 1}</text>)}
        {rows.map(r => <text fontFamily="mono" x={170 + r[0] * 43.2} y={508 + r[1] * 56} fontSize={36} fill={colors.ink}>{r[2].map(t => <tspan fill={t[1] ? C[t[1]] : colors.ink}>{t[0]}</tspan>)}</text>)}
      </Pane>
      <circle cx={210} cy={1080} r={130} fill="none" stroke={colors.ink} strokeOpacity={0.15} strokeWidth={24}/>
      <circle cx={210} cy={1080} r={130} fill="none" stroke={late ? colors.rose : colors.accent} strokeWidth={24} strokeDasharray={d * e / 10 + ' ' + d} transform="rotate(-90 210 1080)"/>
      <text fontFamily="mono" x={210} y={1098} textAnchor="middle" fontSize={50} fontWeight={700} fill={late ? colors.rose : colors.ink}>{Math.floor(e) + '.' + Math.floor(e * 10) % 10 + 's'}</text>
      <text fontFamily="mono" x={400} y={940} fontSize={34} fill={colors.ink} fillOpacity={0.55}>GITHUB WAITS</text>
      <text x={396} y={1050} fontSize={110} fontWeight={900} letterSpacing={-3} fill={colors.ink}>10 s</text>
      <g opacity={late ? clamp(t * 3) : 0} transform={'rotate(-4 660 1170) matrix(' + t + ' 0 0 ' + t + ' ' + 660 * (1 - t) + ' ' + 1170 * (1 - t) + ')'}>
        <text x={400} y={1206} fontSize={96} fontWeight={900} letterSpacing={-2} fill={colors.rose}>TIMEOUT.</text>
      </g>
      <text fontFamily="mono" x={400} y={1190} fontSize={44} fontWeight={700} fill={colors.accent} opacity={fixed ? 1 : 0}>200 OK in 0.2 s</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
    {
      label: '00:00, you know webhooks',
      line: "That's webhooks: one URL, a signature check, and a 200 in under ten seconds. Time.",
      place: 'the clock at 00:00 over a three-line recap',
      source: String.raw`export default function Scene({ time, duration, colors }) {
  ${head(7)}
  const items = [[at('URL'), 'one URL'], [at('signature'), 'check the signature'], [at('200'), '200 in under 10 s']];
  const gg = clamp((time - at('Time')) / 0.3), s = 1 + 0.3 * (1 - easeOutBack(gg)), zero = clock === 0;
  return <svg>
    ${TOP}
    <g transform={'translate(' + j + ' 0)'}>
      <text fontFamily="mono" x={60} y={436} fontSize={34} fill={colors.ink} fillOpacity={0.55}>{'// time left'}</text>
      <text fontFamily="mono" x={510} y={610} textAnchor="middle" fontSize={zero ? 176 : 160} fontWeight={700} fill={zero ? colors.accent : colors.ink}>{'0' + Math.floor(clock / 60) + ':' + (clock % 60 < 10 ? '0' : '') + clock % 60}</text>
      {items.map((it, i) => { const p = easeOutBack(clamp((time - it[0]) / 0.3)); return <g opacity={clamp(p * 3)}>
        <rect x={60} y={688 + i * 104} width={60} height={60} rx={8} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.5} strokeWidth={4}/>
        <polyline points={'72,' + (718 + i * 104) + ' 86,' + (734 + i * 104) + ' 112,' + (698 + i * 104)} fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="70 70" strokeDashoffset={70 * (1 - clamp(p))}/>
        <text fontFamily="mono" x={150} y={734 + i * 104} fontSize={44} fontWeight={700} fill={colors.ink}>{it[1]}</text>
      </g>; })}
    </g>
    <g opacity={clamp(gg * 4)} transform={'rotate(-4 510 1110) matrix(' + s + ' 0 0 ' + s + ' ' + 510 * (1 - s) + ' ' + 1110 * (1 - s) + ')'}>
      <rect x={160} y={1000} width={700} height={230} rx={10} fill={colors.wall} stroke={colors.rose} strokeWidth={6}/>
      <text x={510} y={1180} textAnchor="middle" fontSize={180} fontWeight={900} letterSpacing={-4} fill={colors.rose}>GG.</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
    },
  ],
};
