// The JSX interpreter code scenes run in (src/code/react-scene.mjs): pure, deterministic, and closed to everything a
// scene's source could reach for. A styled reel's scenes are written by a model that read web pages, so these matter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReactScene, renderReactScene } from '../src/code/react-scene.mjs';

const base = { slug: 'react-scene', version: 1, title: 'Scene', width: 240, height: 240, duration: 2, designId: null };
const source = `function Card({x}) { return <div style={{position:'absolute',left:x,top:20,width:40,height:40,background:'#ff0000',borderRadius:8}}/>; }
export default function Scene({time}) { const x=interpolate(time,0,1,20,100);return <div style={{position:'relative',width:240,height:240,background:'#ffffff'}}><Card x={x}/><p style={{position:'absolute',top:120,color:'#000000',fontSize:24}}>React scene</p></div>; }`;

test('pure React components run with deterministic seeking, helpers and maps', () => {
  const scene = parseReactScene({ ...base, source });
  assert.ok(scene);
  const first = renderReactScene(scene, 0), last = renderReactScene(scene, 60);
  assert.equal(first.children[0].props.style.left, 20);
  assert.equal(last.children[0].props.style.left, 100);
  assert.deepEqual(renderReactScene(scene, 0), first);
  const mapped = { ...base, source: `export default function Scene({frame}) { const cards=[{x:1},{x:2}]; return <>{cards.map(({x},i)=><span key={i} style={{opacity:frame/60}}>{x}</span>)}</>; }` };
  assert.equal(renderReactScene(mapped, 30)[0][1].children[0], 2);
  const inline = renderReactScene({ ...base, source: 'export default function Scene(){return <p>Hello <strong>world</strong> !</p>;}' }, 0);
  assert.equal(inline.children[0], 'Hello ');
  assert.equal(inline.children[2], ' !');
  // Image data is bounded at the boundary, not by the text limit.
  const assets = { photo: `data:image/png;base64,${'A'.repeat(20000)}` };
  const image = renderReactScene({ ...base, source: "export default function Scene(){return <img src={asset('photo')}/>;}" }, 0, assets);
  assert.equal(image.props.src, assets.photo);
  assert.throws(() => renderReactScene({ ...base, source: "export default function Scene(){return <p>{asset('photo')}</p>;}" }, 0, assets), /text is too long/);
});

test('source cannot escape through globals, constructors, modules, JSX, events, styles or arbitrary element objects', () => {
  const attacks = [
    "return fetch('https://evil.test');",
    'return window.location;',
    'return globalThis;',
    "return ({}).constructor.constructor('return process')();",
    "const k='con'+'structor'; return ({})[k];",
    'return <script>alert(1)</script>;',
    'return <iframe srcDoc="x"/>;',
    'return <img src="https://evil.test"/>;',
    'return <div onClick={()=>1}/>;',
    "return <div style={{background:'url(https://evil.test)'}}/>;",
    "return {tag:'div',props:{dangerouslySetInnerHTML:{__html:'<script/>'}},children:[]};",
    'return <div {...{ref:()=>1}}/>;',
    "return <div style={{animation:'spin 1s'}}/>;",
    'while(true){}; return null;',
    'function f(){return f();} return f();',
  ];
  for (const attack of attacks) assert.throws(() => renderReactScene({ ...base, source: `export default function Scene(){${attack}}` }, 0), attack);
  // Only React may be imported.
  assert.equal(parseReactScene({ ...base, source: "import x from 'evil'; export default function Scene(){return null;}" }), null);
  assert.ok(parseReactScene({ ...base, source: "import React from 'react'; export default function Scene(){return null;}" }));
});

test('__proto__ and constructor are refused through every way a name reaches the interpreter', () => {
  const run = (body, extras) => renderReactScene({ ...base, source: `export default function Scene(){${body}}` }, 0, {}, false, extras);
  // Written in the source: identifiers, dotted members and JSX names are checked once, when the source parses.
  for (const body of ['const constructor=1; return null;', 'return [].constructor;', 'return ({}).__proto__;', 'const {constructor}={}; return null;', 'return <div ref="x"/>;', 'return <constructor/>;']) {
    assert.equal(parseReactScene({ ...base, source: `export default function Scene(){${body}}` }), null, body);
  }
  // Built while the scene runs: computed members, object and pattern keys, spreads and style keys are checked then.
  for (const body of [
    "const k='con'+'structor'; return [][k];",
    "const k='__pro'+'to__'; return ({})[k];",
    "return ({'__proto__':1});",
    "return ({['con'+'structor']:1});",
    "const {'constructor':c}={}; return null;",
    "const [a]=[1]; return [a][['con','structor'].join('')];",
    "return <div {...{['__pro'+'to__']:1}}/>;",
    "return <div style={{['con'+'structor']:1}}/>;",
  ]) assert.throws(() => run(body), /Unsupported React scene source/, body);
  // A host's names and data.
  assert.throws(() => run('return null;', { helpers: { constructor: () => 1 } }), /Unsupported React scene source/);
  assert.throws(() => run('return null;', { props: JSON.parse('{"__proto__":{"x":1}}') }), /Unsupported React scene source/);
});

test('element lookalikes are checked like any value, and a repeated element gets its own props', () => {
  const run = body => renderReactScene({ ...base, source: `export default function Scene(){${body}}` }, 0, { a: 'data:image/png;base64,AA==' });
  for (const body of [
    "return {tag:'div',props:{onClick:'x'},children:[]};",
    "return {tag:'img',props:{src:'https://evil.test/x.png'},children:[]};",
    "return {tag:'div',props:{style:{background:'url(https://evil.test)'}},children:[]};",
    "const el=<div/>; return {tag:'div',props:{...el.props,onPointerDown:'x'},children:[]};",
    "const el=<div/>; return <g>{{...el,props:{className:'x'}}}</g>;",
  ]) assert.throws(() => run(body), body);
  assert.equal(JSON.stringify(run("const el=<img src={asset('a')}/>; return {...el};")), JSON.stringify({ tag: 'img', props: { src: 'data:image/png;base64,AA==' }, children: [] }));
  const tree = run('const el=<rect width={2} style={{opacity:0.5}}/>; return <g>{el}{el}</g>;');
  assert.deepEqual(tree.children[0], tree.children[1]);
  assert.notEqual(tree.children[0].props, tree.children[1].props);
  assert.notEqual(tree.children[0].props.style, tree.children[1].props.style);
});

test('built-in array functions and repeated output count against the frame budget', () => {
  // 256 references to one 12,000-character string cost a few operations to build; joining or repeating them must not
  // run for seconds or hand back a hundred million characters inside a 400-step budget.
  const SETUP = `const a='aaaaaaaaaa',b=a+a+a+a+a+a+a+a+a+a,c=b+b+b+b+b+b+b+b+b+b,s=c+c+c+c+c+c+c+c+c+c+c+c;
    const x2=[s,s],x4=[...x2,...x2],x8=[...x4,...x4],x16=[...x8,...x8],x32=[...x16,...x16],x64=[...x32,...x32],x128=[...x64,...x64],x256=[...x128,...x128];`;
  const run = body => renderReactScene({ ...base, source: `export default function S(){${SETUP} return ${body};}` }, 0, {}, false, { limits: { ops: 400 } });
  for (const body of ['<div>{x256.filter(x256.join).length}</div>', '<div>{x256.map(x256.join).length}</div>', '<div>{x256.join(s)}</div>', `<div>{[${Array(38).fill('x256')}]}</div>`]) {
    const started = performance.now();
    assert.throws(() => run(body), /too long|too large|budget/, body.slice(0, 40));
    assert.ok(performance.now() - started < 250, `${body.slice(0, 40)} took ${Math.round(performance.now() - started)} ms`);
  }
  assert.deepEqual(run("<div>{['a','b','c'].join('-')}{[1,2].map(n => n * 2).join(',')}</div>").children, ['a-b-c', '2,4']);
});
