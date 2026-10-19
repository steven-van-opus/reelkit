// Speedrun (id 'terminal'): a style (index.mjs) for fast, dry developer explainers told against the
// clock, the short-form "a dev topic in under a minute" format, in its own look. A developer's screen late at
// night: a near-black wall with a faint dot grid, at most two floating panes in a scene (an editor, a terminal, a
// browser, a request inspector) with a hard accent shadow, short real code that types itself in, diagrams in the same
// mono type, and reaction cards for the jokes: a huge verdict in heavy sans, tilted, in colors.rose. Every scene carries
// the same top bar: a "> speedrun <topic>" prompt line and a countdown chip that runs from the video's own length to
// 00:00 across the whole video. Nothing in it is another creator's: no flame or orange-on-black brand, no "in 100
// seconds" series name, no meme images or sounds (reactions are drawn as type). Its reference video (webhooks,
// terminal-reference.mjs) is what the writer remakes; its identity (IDENTITY) is told apart from what each topic brings, so a new video
// builds its own panes, files and commands, never the webhook scenes. Every scene passes the code-scene checks on the
// canvas stage with its own line (test/styles.test.mjs).

import { clockOf, CODE, GLITCH, PANE, TERMINAL_REFERENCE, topBar } from './terminal-reference.mjs';

const FEEL = `A developer's screen late at night, explained against the clock. The wall: colors.wall with a faint 60 px dot grid. Every scene carries the same top bar: a mono prompt line at the top left ("> speedrun git rebase", 36 px, ink at 60%, the ">" in colors.accent; the topic at most 20 characters, like "> speedrun rsc") and a countdown chip at the top right running from the video's length (rounded to 5 s) to 00:00 in the last line, each scene an equal share, over a draining accent bar. Below, at most two floating panes: a code editor (a file tab, dim line numbers, keywords in colors.accent, strings in colors.rose, the line talked about on an accent bar), a terminal (a "$" prompt, commands typing at 45 characters a second, output line by line, a blinking block cursor), a browser or a request inspector. Panes are colors.floor, tilted 1–2°, with a hard accent shadow offset 14 px. Code is short, real and runnable: 3–9 lines of mono at 34–36 px, under 36 characters a line, indent included. Between panes, diagrams in the same mono type: chips, arrows, a packet travelling. Logos slam in as <Mark> stamps. For a joke, cut to a reaction card: a huge verdict in heavy sans (110–180 px), tilted −4°, in colors.rose. Numbers count in mono. Motion is snappy: panes slide up 80 px in 0.25 s, words punch from 120%, every scene opens on a two-frame glitch. Never a slow fade.`;

// What every Speedrun video keeps, what its topic brings, and what it never copies from the reference video.
const IDENTITY = {
  constant: [
    "A developer's screen late at night: the wall in colors.wall with a faint 60 px dot grid",
    'The top bar on every scene: the mono prompt line ("> speedrun <topic>", the ">" in the accent, the topic at most 20 characters) and the countdown chip that runs from the video\'s length to 00:00 across the whole video, over an accent clock bar that drains',
    'At most two floating panes in a scene (a code editor, a terminal, a browser or a request inspector): colors.floor, tilted a degree or two, each with a hard accent shadow; diagrams, reaction cards and the recap need none',
    'Short, real, runnable code in mono: keywords in the accent, strings in colors.rose, dim line numbers, the line being talked about on an accent bar; commands type in fast and output prints line by line under a blinking block cursor',
    'Reaction cards for the jokes: a huge heavy-sans verdict tilted −4° in colors.rose, drawn as type',
    'Snappy motion: panes slide up 80 px in a quarter second, words punch from 120% and settle, a two-frame glitch opens every scene, never a slow fade',
    'A dry, fast script against the clock: what it is in one line, why it exists, how it works in three or four steps with real code, the catch, and a recap as the clock hits 00:00',
    'A left-aligned caption line (drawn for you)',
  ],
  topic: [
    'The tool, language or idea, and which pane or diagram shows each step: the file and its code, the command and its output, the request, the flow',
    'Every command, line of code, output, header, number and version, from your sources, real and runnable',
    "The prompt line's topic (at most 20 characters, shortened like > speedrun rsc), the countdown's starting length (your video's own), the verdicts on the reaction cards and the catch",
    'The logos of the tools it names, as <Mark/> stamps, only where the topic has a maker',
  ],
  never: [
    "The reference video's webhook scenes as they are: its two-app flow, the polling terminal, the server.js route, the curl test, the GitHub request, the HMAC flow and the ten-second ring",
    'The same pane on the same file in every scene: a new file, command or diagram wherever the line moves on',
    "Another creator's logos, series names, catchphrases, meme images or sounds: reactions are drawn as type",
  ],
};

// The same style on another topic, as text: a new pane, file or command wherever the line moves on.
const CONTRAST = {
  topic: 'why a database index makes a query fast',
  title: 'Indexes, against the clock',
  chapters: [
    { label: 'Indexes, against the clock', line: 'An index lets a database jump straight to a row instead of reading every one.', place: 'a title card: INDEXES stamped over a table of rows' },
    { label: 'The full scan', line: 'Without one, finding a user by email means checking every row in the table.', place: 'a terminal where EXPLAIN QUERY PLAN says SCAN users' },
    { label: 'One line fixes it', line: 'CREATE INDEX on the email column builds a sorted tree the database can search.', place: 'an editor on schema.sql, the CREATE INDEX line lit' },
    { label: 'Now it searches', line: 'Ask for the query plan again, and the scan has become a search using the index.', place: 'a terminal where the plan says SEARCH using the index' },
    { label: 'The catch', line: 'Every insert now updates the index too, so index what you search, not everything.', place: 'a reaction card: IT DEPENDS., over an insert timer' },
  ],
};

// The opening and examples, kept as every style keeps them (index.mjs `reference`). With a reference video, the
// writer doesn't see them (guide.mjs lookGuide), so the moves only they show (a regex explained token by token, a <Mark> stamp over an editor, a browser pane, two stacks
// compared) reach the writer only as the feel's words. The tests check them like the reference's scenes.
const OPENING = {
  title: 'The name slams in with an accent and a rose ghost, then a pattern pane: each token of a regex pops in with its meaning under it, and two test strings pass and fail',
  line: 'Regex is a tiny language for finding patterns in text, and it reads like a cat walked across your keyboard.',
  source: String.raw`export default function Scene({ time, duration, colors }) {
  ${clockOf(0, 6, 40)}
  const slam = clamp(time / 0.3), s = 1 + 0.2 * (1 - easeOutBack(slam)), a = easeOut(clamp((time - 0.35) / 0.25));
  const toks = [['^', 'k', 'start', 0], ['\\d{3}', 's', '3 digits', 1], ['-', '', 'a dash', 0], ['\\d{4}', 's', '4 digits', 1], ['$', 'k', 'end', 0]];
  const mid = [175, 304, 434, 564, 693], C = { k: colors.accent, s: colors.rose };
  const pop = i => clamp((time - at('patterns') - i * 0.18) / 0.2), test = easeOut(clamp((time - at('text')) / 0.3));
  const tests = [['555-0142', 1], ['5550-142', 0]];
  ${PANE}
  return <svg>
    ${topBar('regex')}
    <g transform={'translate(' + j + ' 0)'}>
      <text fontFamily="mono" x={60} y={436} fontSize={34} fill={colors.ink} fillOpacity={0.5} opacity={a}>{'// regular expression'}</text>
      {[[colors.rose, -10], [colors.accent, 10], [colors.ink, 0]].map((c, i) => <text x={510 + c[1] * (1 - slam)} y={610} textAnchor="middle" fontSize={170 * s} fontWeight={900} letterSpacing={-4} fill={c[0]} opacity={i < 2 ? 1 - slam : clamp(time / 0.06)}>REGEX</text>)}
      <Pane x={60} y={680} w={900} h={570} file="phone.js" a={a} tilt={-1.5}>
        <text fontFamily="mono" x={110} y={846} fontSize={72} fontWeight={700} fill={colors.ink}><tspan fillOpacity={0.4}>/</tspan>{toks.map((t, i) => <tspan fill={t[1] ? C[t[1]] : colors.ink} fillOpacity={pop(i)}>{t[0]}</tspan>)}<tspan fillOpacity={0.4}>/</tspan></text>
        {toks.map((t, i) => <g opacity={pop(i)}>
          <line x1={mid[i]} y1={872} x2={mid[i]} y2={t[3] ? 940 : 884} stroke={t[1] ? C[t[1]] : colors.ink} strokeWidth={3}/>
          <text fontFamily="mono" x={mid[i]} y={t[3] ? 984 : 926} textAnchor="middle" fontSize={34} fill={colors.ink} fillOpacity={0.75}>{t[2]}</text>
        </g>)}
        {tests.map((t, i) => <g opacity={test} transform={'translate(' + 40 * (1 - test) + ' 0)'}>
          <text fontFamily="mono" x={110} y={1100 + i * 80} fontSize={48} fontWeight={700} fill={t[1] ? colors.ink : colors.rose}>{t[0]}</text>
          {t[1] ? <polyline points={'440,' + (1084 + i * 80) + ' 460,' + (1104 + i * 80) + ' 496,' + (1064 + i * 80)} fill="none" stroke={colors.accent} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"/> : <path d={'M 442 ' + (1066 + i * 80) + ' L 486 ' + (1106 + i * 80) + ' M 486 ' + (1066 + i * 80) + ' L 442 ' + (1106 + i * 80)} stroke={colors.rose} strokeWidth={8} strokeLinecap="round"/>}
          <text fontFamily="mono" x={540} y={1100 + i * 80} fontSize={34} fill={colors.ink} fillOpacity={0.5}>{t[1] ? '// a match' : '// no match'}</text>
        </g>)}
      </Pane>
    </g>
    ${GLITCH}
  </svg>;
}`,
};

const EXAMPLES = [
  {
    title: "A tool's logo slams in as a <Mark> stamp beside its name and its year, then an editor types three lines of it, the line that reads like English lit on the accent bar",
    line: 'Python is a programming language famous for reading almost like plain English.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${clockOf(1, 6, 40)}
  const k = clamp(time / 0.3), s = 1 + 0.2 * (1 - easeOutBack(k)), a = easeOut(clamp((time - 0.4) / 0.25)), t = easeOut(clamp((time - 0.2) / 0.3));
  const src = [
    [0, [['names = ['], ["'Ada'", 's'], [', '], ["'Grace'", 's'], [', '], ["'Guido'", 's'], [']']]],
    [0, [['for ', 'k'], ['name '], ['in ', 'k'], ['names:']]],
    [2, [['print', 'n'], ['('], ["'Hi, '", 's'], [' + name)']]],
  ];
  ${PANE}
  ${CODE}
  return <svg>
    ${topBar('python')}
    <g transform={'translate(' + j + ' 0)'}>
      <g opacity={clamp(k * 4)} transform={'matrix(' + s + ' 0 0 ' + s + ' ' + 210 * (1 - s) + ' ' + 560 * (1 - s) + ')'}>
        <Mark id="m80" x={210} y={560} size={260}/>
      </g>
      <g opacity={t} transform={'translate(' + 60 * (1 - t) + ' 0)'}>
        <text x={390} y={560} fontSize={120} fontWeight={900} letterSpacing={-3} fill={colors.ink}>Python</text>
        <text fontFamily="mono" x={394} y={640} fontSize={36} fill={colors.ink} fillOpacity={0.6}>{'since '}<tspan fill={colors.accent} fillOpacity={1}>1991</tspan></text>
      </g>
      <Pane x={60} y={760} w={900} h={360} file="hello.py" a={a} tilt={1}>
        <Code src={src} x={170} y={884} w={960} size={36} lh={58} typed={(time - 0.5) * 45} bar={time > at('English') ? 1 : -1}/>
      </Pane>
      <text fontFamily="mono" x={60} y={1226} fontSize={34} fill={colors.ink} fillOpacity={0.55} opacity={time > at('English') ? 1 : 0}>{'// reads like a sentence'}</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
  },
  {
    title: 'A browser pane: the address types in, the page answers with JSON whose keys and strings are coloured like code, and the status chips land underneath',
    line: 'Open the endpoint in your browser, and the API answers with plain JSON.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${clockOf(2, 6, 40)}
  const a = easeOut(clamp(time / 0.25)), addr = 'localhost:3000/api/users', u = clamp((time - 0.3) * 45, 0, addr.length);
  const C = { k: colors.accent, s: colors.rose, n: colors.ink };
  const rows = [[['[']], [['  { '], ['"id"', 'k'], [': '], ['1', 'n'], [', '], ['"name"', 'k'], [': '], ['"Ada"', 's'], [' },']], [['  { '], ['"id"', 'k'], [': '], ['2', 'n'], [', '], ['"name"', 'k'], [': '], ['"Grace"', 's'], [' }']], [[']']]];
  const json = clamp((time - at('answers')) / 0.4), chips = easeOutBack(clamp((time - at('JSON')) / 0.3));
  ${PANE}
  return <svg>
    ${topBar('rest apis')}
    <g transform={'translate(' + j + ' 0)'}>
      <Pane x={60} y={392} w={900} h={640} file="browser" a={a} tilt={-1}>
        <rect x={100} y={490} width={820} height={76} rx={10} fill={colors.wall} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2}/>
        <clipPath id="u"><rect x={136} y={496} width={4 + (u < addr.length ? u : u + 2) * 20.4} height={64}/></clipPath>
        <text clipPath="url(#u)" fontFamily="mono" x={140} y={540} fontSize={34} fill={colors.ink}>{addr}</text>
        <rect x={144 + u * 20.4} y={506} width={18} height={40} fill={colors.accent} opacity={u < addr.length ? 1 : 0}/>
        {rows.map((r, i) => <text fontFamily="mono" x={110} y={680 + i * 76} fontSize={40} fill={colors.ink} opacity={json * 4 > i ? 1 : 0}>{r.map(t => <tspan fill={t[1] ? C[t[1]] : colors.ink}>{t[0]}</tspan>)}</text>)}
      </Pane>
      <g opacity={clamp(chips * 3)} transform={'matrix(' + chips + ' 0 0 ' + chips + ' ' + 300 * (1 - chips) + ' ' + 1150 * (1 - chips) + ')'}>
        <rect x={60} y={1100} width={250} height={100} rx={10} fill={colors.floor} stroke={colors.accent} strokeWidth={4}/>
        <text fontFamily="mono" x={185} y={1164} textAnchor="middle" fontSize={40} fontWeight={700} fill={colors.accent}>200 OK</text>
        <rect x={340} y={1100} width={460} height={100} rx={10} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.4} strokeWidth={3}/>
        <text fontFamily="mono" x={570} y={1164} textAnchor="middle" fontSize={36} fill={colors.ink}>application/json</text>
      </g>
    </g>
    ${GLITCH}
  </svg>;
}`,
  },
  {
    title: 'A terminal types the tempting command, then the scene cuts to a reaction card: a huge tilted verdict in rose, over the trade-off in two mono lines',
    line: 'Should you rewrite the whole thing in Rust? It depends.',
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${clockOf(3, 6, 40)}
  const a = easeOut(clamp(time / 0.25)), typed = clamp((time - 0.25) * 45, 0, 28), cmd = 'git checkout -b rust-rewrite';
  const v = clamp((time - at('depends')) / 0.3), s = 1 + 0.25 * (1 - easeOutBack(v)), list = easeOut(clamp((time - at('depends') - 0.3) / 0.3));
  ${PANE}
  return <svg>
    ${topBar('rust')}
    <g transform={'translate(' + j + ' 0)'} opacity={1 - 0.6 * easeOut(v)}>
      <Pane x={60} y={392} w={900} h={300} file="zsh" a={a} tilt={-1.5}>
        <text fontFamily="mono" x={100} y={524} fontSize={34} fill={colors.accent}>$</text>
        <clipPath id="c"><rect x={136} y={484} width={4 + (typed < 28 ? typed : 30) * 20.4} height={56}/></clipPath>
        <text clipPath="url(#c)" fontFamily="mono" x={140} y={524} fontSize={34} fill={colors.ink}>{cmd}</text>
        <rect x={144 + typed * 20.4} y={492} width={20} height={40} fill={colors.accent} opacity={Math.floor(time * 4) % 2 ? 0.2 : 0.9}/>
        <text fontFamily="mono" x={100} y={590} fontSize={34} fill={colors.ink} fillOpacity={0.5} opacity={typed >= 28 ? 1 : 0}>{"Switched to a new branch 'rust-rewrite'"}</text>
      </Pane>
    </g>
    <g opacity={clamp(v * 4)} transform={'rotate(-4 510 880) matrix(' + s + ' 0 0 ' + s + ' ' + 510 * (1 - s) + ' ' + 880 * (1 - s) + ')'}>
      <rect x={90} y={760} width={840} height={240} rx={10} fill={colors.wall} stroke={colors.rose} strokeWidth={6}/>
      <text x={510} y={928} textAnchor="middle" fontSize={124} fontWeight={900} letterSpacing={-3} fill={colors.rose}>IT DEPENDS.</text>
    </g>
    <g opacity={list} transform={'translate(0 ' + 30 * (1 - list) + ')'}>
      <text fontFamily="mono" x={60} y={1130} fontSize={38} fill={colors.ink}><tspan fill={colors.accent}>+ </tspan>memory safe, no garbage collector</text>
      <text fontFamily="mono" x={60} y={1210} fontSize={38} fill={colors.ink}><tspan fill={colors.rose}>- </tspan>you rewrite everything</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
  },
  {
    title: 'Two stacks side by side, layers dropping in from the hardware up: the heavy layer one side lacks lit in rose, the shared one in the accent, and a start-up bar racing under each',
    line: "Containers share the host's kernel, so they start in seconds instead of booting a whole operating system.",
    source: String.raw`export default function Scene({ time, duration, colors }) {
  ${clockOf(4, 6, 40)}
  const stacks = [['VIRTUAL MACHINE', 60, ['app', 'libraries', 'guest OS', 'hypervisor', 'hardware'], 2, colors.rose], ['CONTAINER', 530, ['app', 'libraries', 'runtime', 'host kernel', 'hardware'], 3, colors.accent]];
  const drop = i => easeOutBack(clamp((time - 0.15 - (4 - i) * 0.12) / 0.3));
  const lit = easeOut(clamp((time - at('kernel')) / 0.3)), go = clamp((time - at('start')) / 0.5), vm = clamp((time - at('start')) / (duration - at('start') + 2));
  return <svg>
    ${topBar('containers')}
    <g transform={'translate(' + j + ' 0)'}>
      {stacks.map(st => <g>
        <text fontFamily="mono" x={st[1]} y={436} fontSize={34} fontWeight={700} fill={colors.ink} fillOpacity={0.6}>{st[0]}</text>
        {st[2].map((name, i) => { const d = drop(i), hot = i === st[3]; return <g opacity={clamp(d * 3)} transform={'translate(0 ' + -60 * (1 - d) + ')'}>
          <rect x={st[1]} y={470 + i * 92} width={430} height={80} rx={8} fill={hot ? st[4] : colors.floor} fillOpacity={hot ? 0.12 + 0.2 * lit : 1} stroke={hot ? st[4] : colors.ink} strokeOpacity={hot ? 1 : 0.3} strokeWidth={hot ? 4 : 2}/>
          <text fontFamily="mono" x={st[1] + 28} y={522 + i * 92} fontSize={36} fontWeight={hot ? 700 : 400} fill={colors.ink}>{name}</text>
        </g>; })}
      </g>)}
      <text fontFamily="mono" x={60} y={1010} fontSize={34} fill={colors.ink} fillOpacity={0.6}>BOOTS AN OS</text>
      <rect x={60} y={1036} width={430} height={36} rx={6} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2}/>
      <rect x={60} y={1036} width={430 * vm} height={36} rx={6} fill={colors.rose}/>
      <text fontFamily="mono" x={530} y={1010} fontSize={34} fill={colors.ink} fillOpacity={0.6}>STARTS A PROCESS</text>
      <rect x={530} y={1036} width={430} height={36} rx={6} fill={colors.floor} stroke={colors.ink} strokeOpacity={0.3} strokeWidth={2}/>
      <rect x={530} y={1036} width={430 * easeOut(go)} height={36} rx={6} fill={colors.accent}/>
      <text x={530} y={1220} fontSize={110} fontWeight={900} letterSpacing={-3} fill={colors.accent} opacity={go}>seconds</text>
      <text fontFamily="mono" x={60} y={1200} fontSize={40} fontWeight={700} fill={colors.rose} opacity={go}>{Math.round(vm * 100) + '% booted'}</text>
    </g>
    ${GLITCH}
  </svg>;
}`,
  },
];

export const TERMINAL = {
  id: 'terminal',
  name: 'Speedrun',
  feel: FEEL,
  identity: IDENTITY,
  contrast: CONTRAST,
  opening: OPENING,
  examples: EXAMPLES,
  reference: TERMINAL_REFERENCE,
  // Sans captions until a mono face is bundled: the mono is a system font chain that sets differently from machine to
  // machine (canvas.mjs canvasFont), and a caption line must fit its band.
  frame: { captions: { kind: 'line-left', font: 'sans', weight: 800, size: 58, upper: false, color: 'ink', highlight: 'accent', dim: 0.4 }, grain: false, vignette: false },
  // A terminal's colours: phosphor green for the prompt, cursor, clock, shadows, keywords and the caption highlight
  // (primary → colors.accent), editor-string yellow for strings and the verdicts (accent → colors.rose), in a neutral
  // white on a blue-black screen with no purple cast.
  palette: { primary: '#4ADE80', accent: '#F4E35C', ink: '#E8ECEF', background: '#0D1014' },
  // A synth pulse under a voice that never stops, barely ducked, that drops out under the payoff; interface blips as
  // each pane lights up, a scan into the opening and a double blip on the keyword.
  sound: 'terminal',
};
