'use strict';

const acorn = require('acorn');

const PARSE_OPTIONS = Object.freeze({
  ecmaVersion: 'latest',
  allowAwaitOutsideFunction: true,
  sourceType: 'script',
});

function tryParse(code) {
  try { return acorn.parse(code, PARSE_OPTIONS); }
  catch { return null; }
}

function applyEdits(code, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let result = code;
  for (const e of sorted) {
    result = result.slice(0, e.start) + e.text + result.slice(e.end);
  }
  return result;
}

function rewritePattern(pattern, code) {
  if (pattern.type === 'Identifier') {
    return `globalThis.${pattern.name}`;
  }
  if (pattern.type === 'ObjectPattern') {
    const parts = pattern.properties.map((p) => {
      if (p.type === 'RestElement') {
        return `...${rewritePattern(p.argument, code)}`;
      }
      const keyText = p.computed
        ? `[${code.slice(p.key.start, p.key.end)}]`
        : p.key.type === 'Identifier' ? p.key.name : code.slice(p.key.start, p.key.end);
      return `${keyText}: ${rewritePattern(p.value, code)}`;
    });
    return `{ ${parts.join(', ')} }`;
  }
  if (pattern.type === 'ArrayPattern') {
    const parts = pattern.elements.map((el) => {
      if (el === null) return '';
      if (el.type === 'RestElement') {
        return `...${rewritePattern(el.argument, code)}`;
      }
      return rewritePattern(el, code);
    });
    return `[${parts.join(', ')}]`;
  }
  if (pattern.type === 'AssignmentPattern') {
    const left = rewritePattern(pattern.left, code);
    const right = code.slice(pattern.right.start, pattern.right.end);
    return `${left} = ${right}`;
  }
  return code.slice(pattern.start, pattern.end);
}

function rewriteVarDecl(node, code) {
  const parts = node.declarations.map((decl) => {
    const target = rewritePattern(decl.id, code);
    const init = decl.init ? code.slice(decl.init.start, decl.init.end) : 'undefined';
    return `${target} = ${init}`;
  });
  const hasObjectPattern = node.declarations.some((d) => d.id.type === 'ObjectPattern');
  return {
    start: node.start,
    end: node.end,
    text: hasObjectPattern ? `(${parts.join(', ')});` : `${parts.join(', ')};`,
  };
}

function rewriteFuncDecl(node, code) {
  return {
    start: node.start,
    end: node.end,
    text: `globalThis.${node.id.name} = (${code.slice(node.start, node.end)});`,
  };
}

function rewriteClassDecl(node, code) {
  return {
    start: node.start,
    end: node.end,
    text: `globalThis.${node.id.name} = (${code.slice(node.start, node.end)});`,
  };
}

function collectTopLevelEdits(ast, code) {
  const edits = [];
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') {
      edits.push(rewriteVarDecl(node, code));
    } else if (node.type === 'FunctionDeclaration' && node.id) {
      edits.push(rewriteFuncDecl(node, code));
    } else if (node.type === 'ClassDeclaration' && node.id) {
      edits.push(rewriteClassDecl(node, code));
    }
  }
  return edits;
}

function promoteTopLevelDecls(code) {
  const ast = tryParse(code);
  if (!ast) return code;
  return applyEdits(code, collectTopLevelEdits(ast, code));
}

function downgradeTopLevelLetConst(code) {
  const ast = tryParse(code);
  if (!ast) return code;
  const edits = [];
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const')) {
      edits.push({
        start: node.start,
        end: node.start + node.kind.length,
        text: 'var',
      });
    }
  }
  return applyEdits(code, edits);
}

function wrapForAsync(code) {
  return `(async () => (${code}))()`;
}

function wrapForAsyncBlock(code) {
  const promoted = promoteTopLevelDecls(code);
  const ast = tryParse(promoted);
  if (ast && ast.body.length > 0) {
    const last = ast.body[ast.body.length - 1];
    if (last.type === 'ExpressionStatement') {
      const head = promoted.slice(0, last.start);
      const expr = promoted.slice(last.expression.start, last.expression.end);
      const tail = promoted.slice(last.end);
      return `(async () => { ${head}return (${expr});${tail} })()`;
    }
  }
  return `(async () => { ${promoted} })()`;
}

const FUNCTION_BOUNDARY_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'MethodDefinition',
  'ClassDeclaration',
  'ClassExpression',
]);

function containsAwaitOutsideFunctions(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'AwaitExpression') return true;
  if (FUNCTION_BOUNDARY_TYPES.has(node.type)) return false;
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (containsAwaitOutsideFunctions(item)) return true;
      }
    } else if (value && typeof value === 'object') {
      if (containsAwaitOutsideFunctions(value)) return true;
    }
  }
  return false;
}

function codeHasTopLevelAwait(code) {
  const ast = tryParse(code);
  if (!ast) return false;
  return ast.body.some(containsAwaitOutsideFunctions);
}

function isTopLevelAwaitError(err) {
  if (!err) return false;
  if (err.name !== 'SyntaxError') return false;
  return /await is only valid|top-level await/i.test(err.message || '');
}

module.exports = {
  downgradeTopLevelLetConst,
  promoteTopLevelDecls,
  wrapForAsync,
  wrapForAsyncBlock,
  codeHasTopLevelAwait,
  isTopLevelAwaitError,
};
