'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { globToRegex } = require('./glob-util.js');

function Ls(basePath = '.', pattern = '*') {
  const base = path.resolve(basePath);
  let entries;
  try { entries = fs.readdirSync(base); }
  catch { return []; }
  const re = globToRegex(pattern);
  return entries.filter((n) => re.test(n)).sort();
}

module.exports = { Ls };
