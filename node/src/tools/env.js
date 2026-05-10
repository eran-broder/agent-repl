'use strict';

function Cwd() {
  return process.cwd();
}

function Cd(dir) {
  process.chdir(dir);
  return process.cwd();
}

function Env(name, value) {
  if (name === undefined) return { ...process.env };
  if (value !== undefined) process.env[name] = value;
  return process.env[name] || '';
}

module.exports = { Cwd, Cd, Env };
