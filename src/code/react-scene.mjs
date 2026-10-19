import { parse } from '@babel/parser';

/** A pure, frame-controlled JSX runtime for code scenes (scene.mjs). Source is parsed, never eval'd.
 * The interpreter has no browser, network, filesystem, prototype or module
 * access. React receives only checked element descriptions, never callbacks.
 * A finite instruction budget applies to every frame, including recursion.
 */

const tags = new Set(
  'div span p h1 h2 h3 h4 section article header footer main strong em b i small br img button svg g path rect circle ellipse line polyline polygon defs linearGradient radialGradient stop clipPath mask filter feGaussianBlur feOffset feBlend feColorMatrix feComposite feFlood feMerge feMergeNode feDropShadow feTurbulence text textPath tspan image'.split(
    ' ',
  ),
);
const forbidden = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'caller',
  'callee',
  'arguments',
  'ref',
  'dangerouslySetInnerHTML',
  'innerHTML',
  'outerHTML',
  'srcDoc',
  'srcSet',
  'is',
]);
const grammar = new Set(
  'File Program ImportDeclaration ImportSpecifier ImportDefaultSpecifier ImportNamespaceSpecifier ExportDefaultDeclaration FunctionDeclaration FunctionExpression ArrowFunctionExpression BlockStatement ReturnStatement VariableDeclaration VariableDeclarator IfStatement ExpressionStatement Identifier NumericLiteral StringLiteral BooleanLiteral NullLiteral ObjectExpression ObjectProperty ObjectPattern ArrayExpression ArrayPattern MemberExpression CallExpression UnaryExpression BinaryExpression LogicalExpression ConditionalExpression TemplateLiteral TemplateElement JSXElement JSXOpeningElement JSXClosingElement JSXIdentifier JSXAttribute JSXExpressionContainer JSXText JSXFragment JSXOpeningFragment JSXClosingFragment JSXMemberExpression JSXEmptyExpression SpreadElement JSXSpreadAttribute AssignmentPattern'.split(
    ' ',
  ),
);
const cache = new Map();
/** A host's input as the scene sees it: null-prototype copies of plain objects, arrays, strings, numbers and booleans. */
function plainData(value, depth = 0) {
  if (depth > 8) fail();
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.slice(0, 256).map((v) => plainData(v, depth + 1));
  if (value && typeof value === 'object') {
    const out = Object.create(null);
    for (const [k, v] of Object.entries(value)) out[key(k)] = plainData(v, depth + 1);
    return out;
  }
  return undefined;
}
const sourceElements = new WeakMap();
function fail(message = 'Unsupported React scene source') {
  throw new Error(message);
}
function key(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return fail();
  const k = String(value);
  if (forbidden.has(k)) fail();
  return k;
}
function ast(source) {
  if (cache.has(source)) return cache.get(source);
  if (typeof source !== 'string' || source.length > 40000 || !source.trim())
    fail();
  const program = parse(source, {
    sourceType: 'module',
    plugins: ['jsx'],
  }).program;
  let count = 0;
  const visit = (node, depth = 0) => {
    if (!node || typeof node !== 'object') return;
    if (++count > 8000 || depth > 80) fail('React scene is too complex');
    if (node.type && !grammar.has(node.type))
      fail(`Unsupported React syntax: ${node.type}`);
    if (node.type === 'Identifier' || node.type === 'JSXIdentifier')
      key(node.name);
    if (
      node.type === 'ImportDeclaration' &&
      node.source.value !== 'react'
    )
      fail('Only React imports are supported');
    for (const [k, v] of Object.entries(node))
      if (
        ![
          'loc',
          'start',
          'end',
          'extra',
          'comments',
          'leadingComments',
          'trailingComments',
          'innerComments',
        ].includes(k)
      ) {
        if (Array.isArray(v)) v.forEach((n) => visit(n, depth + 1));
        else if (v && typeof v === 'object') visit(v, depth + 1);
      }
  };
  visit(program);
  if (
    program.body.filter((n) => n.type === 'ExportDefaultDeclaration')
      .length !== 1
  )
    fail('Export one default React component');
  if (cache.size >= 8) cache.delete(cache.keys().next().value);
  cache.set(source, program);
  return program;
}
/**
 * Stable source-order JSX IDs survive text/style edits, never generated props. `components`: host components (helpers
 * called as elements, like an explainer's <Mark/>) that count as elements too.
 */
export function sceneSourceElements(source,components=[]){
  const program=ast(source);
  const key=components.join(',');
  let byKey=sourceElements.get(program);
  if(!byKey){byKey=new Map();sourceElements.set(program,byKey);}
  let result=byKey.get(key);
  if(!result){
    result=[];
    const visit=(node)=>{
      if(!node||typeof node!=='object')return;
      if(node.type==='JSXElement'&&node.openingElement.name.type==='JSXIdentifier'&&(tags.has(node.openingElement.name.name)||components.includes(node.openingElement.name.name)))result.push(node);
      for(const [name,value] of Object.entries(node)){
        if(['loc','extra','comments','leadingComments','trailingComments','innerComments'].includes(name))continue;
        if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);
      }
    };
    visit(program);result.sort((a,b)=>a.start-b.start);byKey.set(key,result);
  }
  return result;
}
export function parseReactScene(value) {
  try {
    const v = value;
    if (
      !v ||
      v.slug !== 'react-scene' ||
      v.version !== 1 ||
      typeof v.title !== 'string' ||
      !v.title.trim() ||
      v.title.length > 120 ||
      ![v.width, v.height].every(
        (n) => Number.isInteger(n) && n >= 64 && n <= 4096,
      ) ||
      !Number.isFinite(v.duration) ||
      v.duration < 1 ||
      v.duration > 45 ||
      !(
        v.designId === null ||
        (typeof v.designId === 'string' && /^[\da-f-]{36}$/i.test(v.designId))
      )
    )
      return null;
    if (v.source !== '' || v.designId === null) ast(v.source);
    return {
      slug: 'react-scene',
      version: 1,
      title: v.title,
      width: v.width,
      height: v.height,
      duration: v.duration,
      designId: v.designId,
      source: v.source,
    };
  } catch {
    return null;
  }
}
/**
 * What a host adds for one frame: plain data merged into the component's props (copied, so the scene can't keep a
 * reference), and pure helper functions it can call by name (an explainer code scene's at('word'), for one).
 */
/**
 * `limits` can only tighten the per-frame budget (`ops`, interpreter steps) and the elements one frame may build: a
 * host drawing something small every frame next to a scene (an explainer's character) holds it to less.
 */

export function renderReactScene(
  scene,
  frame,
  assets = {},
  inspect = false,
  extras = {},
) {
  if (!Number.isFinite(frame)) fail();
  const cap = (limit, most) => (typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? Math.min(most, Math.floor(limit)) : most);
  let budget = cap(extras.limits?.ops, 50000),
    elements = 0,
    textSize = 0;
  const maxElements = cap(extras.limits?.elements, 2000);
  const assetUrls = new Set(Object.values(assets));
  const checkedUrls = new Map();
  const origins=new WeakMap();
  const sourceIds=inspect?new Map(sceneSourceElements(scene.source,extras.components).map((node,index)=>[node,index])):null;
  const tick = () => {
    if (--budget < 0) fail('React scene exceeded its frame budget');
  };
  const functions = new WeakMap();
  // Elements jsx() built this frame: their props are props() output already, and a scene can't change them (it has no
  // assignment), only build lookalike objects, which check() runs through props() like any other value.
  const built = new WeakSet();
  const fn = (run) => {
    const token = Object.create(null);
    functions.set(token, run);
    return token;
  };
  const call = (token, args) => {
    tick();
    const run =
      token && typeof token === 'object' ? functions.get(token) : null;
    return run ? run(args) : fail('Only pure scene functions can be called');
  };

  // Names here and in `property` are the source's own identifiers, every one already checked by key() in ast(). Values
  // computed while the scene runs (a computed member, an object or pattern key, a spread) still go through key().
  const get = (scope, name) => {
    for (const s of scope) if (s.has(name)) return s.get(name);
    return fail(`Unknown scene value: ${name}`);
  };
  const member = (obj, name) => property(obj, key(name));
  const property = (obj, k) => {
    if (Array.isArray(obj) && ['map', 'slice', 'filter', 'join'].includes(k))
      return fn((args) =>
        // A built-in (a join) can be the callback itself, so its results are checked here like a scene function's.
        k === 'map'
          ? obj.map((v, i) => bound(call(args[0], [v, i]), true))
          : k === 'filter'
            ? obj.filter((v, i) => call(args[0], [v, i]))
            : k === 'join'
              ? joined(obj, typeof args[0] === 'string' ? args[0] : ',')
              : obj.slice(
                  Number(args[0]) || 0,
                  args[1] === undefined ? obj.length : Number(args[1]),
                ),
      );
    if ((Array.isArray(obj) || typeof obj === 'string') && k === 'length')
      return obj.length;
    if (obj && typeof obj === 'object' && Object.hasOwn(obj, k)) return obj[k];
    return undefined;
  };
  // A join's length is known before it is built: one too long for scene text is refused, never assembled.
  const joined = (items, separator) => {
    let size = separator.length * Math.max(0, items.length - 1);
    const parts = items.map((v) => {
      tick();
      if (v && typeof v === 'object') fail();
      const part = String(v ?? '');
      size += part.length;
      return part;
    });
    return size > 12000 ? fail('Scene text is too long') : parts.join(separator);
  };
  const bound = (v, allowAsset = false) => {
    if (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 1e9))
      fail('Invalid scene number');
    if (
      typeof v === 'string' &&
      v.length > 12000 &&
      !(allowAsset && assetUrls.has(v))
    )
      fail('Scene text is too long');
    if (Array.isArray(v) && v.length > 256) fail('Too many scene items');
    return v;
  };
  const bind = (pattern, value, scope) => {
    tick();
    if (pattern.type === 'Identifier') {
      scope[0].set(key(pattern.name), value);
      return;
    }
    if (pattern.type === 'AssignmentPattern') {
      bind(
        pattern.left,
        value === undefined ? expr(pattern.right, scope) : value,
        scope,
      );
      return;
    }
    if (pattern.type === 'ObjectPattern') {
      for (const p of pattern.properties)
        bind(p.value, member(value, p.key.name || p.key.value), scope);
      return;
    }
    if (pattern.type === 'ArrayPattern') {
      pattern.elements.forEach((p, i) => {
        if (p) bind(p, member(value, i), scope);
      });
      return;
    }
    fail('Unsupported component argument');
  };
  const closure = (n, scope) =>
    fn((args) => {
      const local = [new Map(), ...scope];
      n.params.forEach((p, i) => bind(p, args[i], local));
      return n.body.type === 'BlockStatement'
        ? block(n.body.body, local)?.value
        : expr(n.body, local);
    });
  const block = (nodes, scope) => {
    for (const n of nodes) {
      tick();
      if (n.type === 'ReturnStatement')
        return { value: n.argument ? expr(n.argument, scope) : null };
      if (n.type === 'VariableDeclaration') {
        for (const d of n.declarations)
          bind(d.id, d.init ? expr(d.init, scope) : undefined, scope);
      } else if (n.type === 'FunctionDeclaration')
        scope[0].set(key(n.id.name), closure(n, scope));
      else if (n.type === 'IfStatement') {
        const branch = expr(n.test, scope) ? n.consequent : n.alternate;
        if (branch) {
          const result = block(
            branch.type === 'BlockStatement' ? branch.body : [branch],
            [new Map(), ...scope],
          );
          if (result) return result;
        }
      } else if (n.type === 'ExpressionStatement') expr(n.expression, scope);
      else if (n.type === 'BlockStatement') {
        const result = block(n.body, [new Map(), ...scope]);
        if (result) return result;
      } else if (n.type !== 'VariableDeclaration') fail();
    }
  };
  const urlAllowed = (v) => {
    if (typeof v !== 'string') return false;
    if (checkedUrls.has(v)) return checkedUrls.get(v);
    const allowed =
      v.startsWith('#') ||
      (assetUrls.has(v) &&
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v));
    checkedUrls.set(v, allowed);
    return allowed;
  };
  const props = (input) => {
    const out = {};
    for (const [name, v] of Object.entries(input)) {
      key(name);
      if (
        /^on/i.test(name) ||
        [
          'className',
          'contentEditable',
          'autoFocus',
          'formAction',
          'action',
          'target',
          'download',
          'ping',
          'xmlns',
          'xmlnsXlink',
        ].includes(name)
      )
        fail('Scene elements cannot run events or navigation');
      if (name === 'style') {
        if (!v || typeof v !== 'object' || Array.isArray(v)) fail();
        const style = {};
        for (const [k, x] of Object.entries(v)) {
          key(k);
          if (
            !/^[a-zA-Z][a-zA-Z0-9]*$/.test(k) ||
            !['string', 'number'].includes(typeof x)
          )
            fail();
          // Inline data/reference URLs are allowed only through image elements.
          // No CSS escapes, custom properties, animations, URL loaders or imports.
          if (
            /url\s*\(|image-set|var\s*\(|expression|@|\\|[<>]/i.test(
              String(x),
            ) ||
            /^(animation|transition|behavior|WebkitUserModify)/i.test(k)
          )
            fail('Use frame values, not CSS loaders or timers');
          style[k] = bound(x);
        }
        out.style = style;
      } else if (['src', 'href', 'xlinkHref'].includes(name)) {
        if (!urlAllowed(v)) fail('Use an imported asset, not an external URL');
        out[name] = v;
      } else if (
        v === null ||
        typeof v === 'string' ||
        typeof v === 'boolean' ||
        typeof v === 'number'
      ) {
        out[name] = bound(v);
      } else fail('Invalid scene property');
    }
    return out;
  };
  const jsx = (n, scope) => {
    tick();
    if (++elements > maxElements) fail('Too many scene elements');
    if (n.type === 'JSXText') {
      textSize += n.value.length;
      if (textSize > 100000) fail();
      // Match JSX whitespace: indentation is not text, but intentional spaces
      // beside inline elements must survive ("Hello <strong>world</strong>").
      const lines = n.value.split(/\r\n|\n|\r/);
      let lastTextLine = 0;
      lines.forEach((line, i) => {
        if (/[^ \t]/.test(line)) lastTextLine = i;
      });
      return (
        lines
          .map((line, i) => {
            let text = line.replace(/\t/g, ' ');
            if (i !== 0) text = text.replace(/^ +/, '');
            if (i !== lines.length - 1) text = text.replace(/ +$/, '');
            return text && i !== lastTextLine ? text + ' ' : text;
          })
          .join('') || null
      );
    }
    if (n.type === 'JSXExpressionContainer')
      return n.expression.type === 'JSXEmptyExpression'
        ? null
        : expr(n.expression, scope);
    const children = n.children
      .map((c) => jsx(c, scope))
      .filter((v) => v !== null);
    if (n.type === 'JSXFragment') return children;
    const opening = n.openingElement;
    const p = Object.create(null);
    for (const a of opening.attributes) {
      if (a.type === 'JSXSpreadAttribute') {
        const spread = expr(a.argument, scope);
        if (!spread || typeof spread !== 'object' || Array.isArray(spread))
          fail();
        Object.assign(p, spread);
      } else
        p[key(a.name.name)] = !a.value
          ? true
          : a.value.type === 'StringLiteral'
            ? a.value.value
            : expr(a.value.expression, scope);
    }
    if (opening.name.type !== 'JSXIdentifier')
      fail('Use native elements and pure React components');
    const name = opening.name.name;
    if (/^[A-Z]/.test(name)) {
      const out = call(get(scope, name), [{ ...p, children }]);
      // A host component's element keeps its place in the source, so it can be picked like a native one.
      if (sourceIds?.has(n) && out && typeof out === 'object' && !Array.isArray(out)) origins.set(out, sourceIds.get(n));
      return out;
    }
    if (!tags.has(name)) fail(`Unsupported scene element: ${name}`);
    const node={ tag: name, props: props(p), children };
    built.add(node);
    if(sourceIds?.has(n))origins.set(node,sourceIds.get(n));
    return node;
  };
  const expr = (n, scope) => {
    tick();
    let v;
    switch (n.type) {
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
        v = n.value;
        break;
      case 'NullLiteral':
        return null;
      case 'Identifier':
        return get(scope, n.name);
      case 'ArrayExpression':
        v = n.elements.flatMap((e) =>
          e?.type === 'SpreadElement'
            ? expr(e.argument, scope)
            : [e ? expr(e, scope) : null],
        );
        break;
      case 'ObjectExpression':
        v = Object.create(null);
        for (const p of n.properties) {
          if (p.type === 'SpreadElement') {
            const spread = expr(p.argument, scope);
            if (!spread || typeof spread !== 'object' || Array.isArray(spread))
              fail();
            for (const k of Object.keys(spread)) v[key(k)] = spread[k];
          } else
            v[
              key(p.computed ? expr(p.key, scope) : (p.key.name ?? p.key.value))
            ] = expr(p.value, scope);
        }
        break;
      case 'MemberExpression':
        return n.computed
          ? member(expr(n.object, scope), expr(n.property, scope))
          : property(expr(n.object, scope), n.property.name);
      case 'CallExpression': {
        const callee = expr(n.callee, scope);
        // Name what can't be called, so the author can fix it ("toFixed() isn't available in a scene").
        if (!callee || typeof callee !== 'object' || !functions.has(callee)) {
          const name = n.callee.type === 'Identifier' ? n.callee.name : n.callee.type === 'MemberExpression' && !n.callee.computed ? n.callee.property.name : null;
          fail(name ? `${name}() isn't available in a scene` : 'Only pure scene functions can be called');
        }
        return bound(
          call(
            callee,
            n.arguments.map((a) => expr(a, scope)),
          ),
          true,
        );
      }
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return closure(n, scope);
      case 'ConditionalExpression':
        return expr(expr(n.test, scope) ? n.consequent : n.alternate, scope);
      case 'LogicalExpression': {
        const a = expr(n.left, scope);
        return n.operator === '&&'
          ? a
            ? expr(n.right, scope)
            : a
          : n.operator === '||'
            ? a || expr(n.right, scope)
            : (a ?? expr(n.right, scope));
      }
      case 'UnaryExpression': {
        const a = expr(n.argument, scope);
        if (n.operator === '!') return !a;
        if (n.operator === '-') v = -a;
        else if (n.operator === '+') v = +a;
        else if (n.operator === 'typeof') return typeof a;
        else fail();
        break;
      }
      case 'BinaryExpression': {
        const a = expr(n.left, scope),
          b = expr(n.right, scope);
        if (
          (typeof a === 'object' && a !== null) ||
          (typeof b === 'object' && b !== null)
        )
          fail();
        switch (n.operator) {
          case '+':
            v = a + b;
            break;
          case '-':
            v = a - b;
            break;
          case '*':
            v = a * b;
            break;
          case '/':
            v = a / b;
            break;
          case '%':
            v = a % b;
            break;
          case '**':
            v = a ** b;
            break;
          case '<':
            return a < b;
          case '>':
            return a > b;
          case '<=':
            return a <= b;
          case '>=':
            return a >= b;
          case '===':
            return a === b;
          case '!==':
            return a !== b;
          default:
            fail();
        }
        break;
      }
      case 'TemplateLiteral':
        v = n.quasis
          .map((q, i) => {
            const part =
              i < n.expressions.length ? expr(n.expressions[i], scope) : '';
            if (part && typeof part === 'object') fail();
            return q.value.cooked + part;
          })
          .join('');
        break;
      case 'JSXElement':
      case 'JSXFragment':
        return jsx(n, scope);
      default:
        fail(`Unsupported scene expression: ${n.type}`);
    }
    return bound(v);
  };
  const math = Object.create(null);
  for (const name of [
    'min',
    'max',
    'abs',
    'sin',
    'cos',
    'tan',
    'floor',
    'ceil',
    'round',
    'sqrt',
    'pow',
    'exp',
  ])
    math[name] = fn((args) => {
      if (args.length > 256 || args.some((x) => typeof x !== 'number')) fail();
      return bound((Math)[name](...args));
    });
  math.PI = Math.PI;
  const globals = new Map([
    ['Math', math],
    ['undefined', undefined],
    [
      'asset',
      fn(([id]) =>
        typeof id === 'string' && Object.hasOwn(assets, id)
          ? assets[id]
          : fail('Imported asset missing'),
      ),
    ],
    [
      'interpolate',
      fn(([t, a, b, x, y]) => {
        if ([t, a, b, x, y].some((n) => typeof n !== 'number') || a === b)
          fail();
        const p = Math.max(0, Math.min(1, (t - a) / (b - a)));
        return x + (y - x) * p;
      }),
    ],
    [
      'ease',
      fn(([p]) => {
        if (typeof p !== 'number') fail();
        const t = Math.max(0, Math.min(1, p));
        return t * t * (3 - 2 * t);
      }),
    ],
  ]);
  for (const [name, run] of Object.entries(extras.helpers ?? {})) {
    key(name);
    globals.set(name, fn((args) => run(args)));
  }
  const scope = [new Map(), globals];
  let main;
  for (const n of ast(scene.source).body) {
    if (n.type === 'ImportDeclaration') {
      if (n.source.value === 'react') continue;
      for (const s of n.specifiers) {
        if (s.type !== 'ImportSpecifier' || !globals.has(s.imported.name))
          fail();
        scope[0].set(s.local.name, globals.get(s.imported.name));
      }
    } else if (n.type === 'ExportDefaultDeclaration') {
      main =
        n.declaration.type === 'FunctionDeclaration'
          ? closure(n.declaration, scope)
          : expr(n.declaration, scope);
    } else block([n], scope);
  }
  const tree = call(main, [
    {
      frame,
      time: frame / 60,
      width: scene.width,
      height: scene.height,
      duration: scene.duration,
      ...(extras.props ? plainData(extras.props) : {}),
    },
  ]);
  // Reject leaked function tokens, arbitrary objects or excessively expanded trees. `output` is what the frame hands
  // React, in characters (asset URLs aside, each bounded on its own): many references to one long string cost
  // nothing to build and everything to render.
  let nodes = 0,
    output = 0;
  const counted = (v) => {
    if (typeof v === 'string' && !assetUrls.has(v) && (output += v.length) > 2_000_000) fail('Scene output is too large');
    return v;
  };
  const check = (v, depth = 0) => {
    if (++nodes > 10000 || depth > 80) fail('Scene output is too large');
    if (v == null || typeof v === 'boolean') return null;
    if (typeof v === 'string' || typeof v === 'number') return counted(bound(v));
    if (Array.isArray(v)) return v.map((x) => check(x, depth + 1));
    if (
      !v ||
      !tags.has(v.tag) ||
      !Array.isArray(v.children) ||
      !v.props ||
      functions.has(v)
    )
      fail('Component must return React elements');
    // A built element's own props, the first time it's placed; placed again, it gets fresh ones, so no two output
    // elements share a props object.
    const checked = built.delete(v) ? v.props : props(v.props);
    for (const value of Object.values(checked)) {
      if (value && typeof value === 'object') Object.values(value).forEach(counted);
      else counted(value);
    }
    return {
      tag: v.tag,
      props: checked,
      children: v.children.map((x) => check(x, depth + 1)),
      ...(inspect&&origins.has(v)?{sourceId:origins.get(v)}:{}),
    };
  };
  return check(tree);
}
