'use strict';

const fs = require('node:fs');
const path = require('node:path');

function Read(filePath, encoding = 'utf-8') {
  return fs.readFileSync(filePath, encoding);
}

function Write(filePath, content, encoding = 'utf-8') {
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, encoding);
  return Buffer.byteLength(content, encoding);
}

function replaceN(haystack, needle, replacement, count) {
  if (count === -1) return haystack.split(needle).join(replacement);
  let out = haystack;
  let remaining = count;
  let from = 0;
  while (remaining > 0) {
    const at = out.indexOf(needle, from);
    if (at === -1) break;
    out = out.slice(0, at) + replacement + out.slice(at + needle.length);
    from = at + replacement.length;
    remaining--;
  }
  return out;
}

function Edit(filePath, oldStr, newStr, count = 1) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const updated = replaceN(original, oldStr, newStr, count);
  if (updated === original) return false;
  fs.writeFileSync(filePath, updated, 'utf-8');
  return true;
}

module.exports = { Read, Write, Edit };
