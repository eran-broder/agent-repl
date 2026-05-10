'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { globToRegex, walkFiles, relPosix } = require('./glob-util.js');

function Glob(pattern, basePath = '.', recursive = true) {
  const base = path.resolve(basePath);
  const effective = (recursive && !pattern.includes('**')) ? `**/${pattern}` : pattern;
  const re = globToRegex(effective);
  const matches = [];
  walkFiles(base, (full) => {
    if (re.test(relPosix(base, full))) matches.push(full);
  });
  return matches.sort();
}

function readLines(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8').split(/\r?\n/); }
  catch { return null; }
}

function Grep(pattern, opts = {}) {
  const {
    path: basePath = '.',
    glob = '**/*',
    ignoreCase = false,
    context = 0,
    maxMatches = 100,
  } = opts;
  const base = path.resolve(basePath);
  const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
  const globRe = globToRegex(glob);
  const results = [];
  walkFiles(base, (full) => {
    if (results.length >= maxMatches) return;
    if (!globRe.test(relPosix(base, full))) return;
    const lines = readLines(full);
    if (!lines) return;
    for (let i = 0; i < lines.length; i++) {
      if (!regex.test(lines[i])) continue;
      const ctxStart = Math.max(0, i - context);
      const ctxEnd = Math.min(lines.length, i + context + 1);
      results.push({
        file: full,
        line: i + 1,
        match: lines[i].trim(),
        context: context > 0 ? lines.slice(ctxStart, ctxEnd) : null,
      });
      if (results.length >= maxMatches) break;
    }
  });
  return results;
}

module.exports = { Glob, Grep };
