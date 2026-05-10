'use strict';

const { Bash } = require('./shell.js');
const { Read, Write, Edit } = require('./files.js');
const { Glob, Grep } = require('./search.js');
const { Ls } = require('./listing.js');
const { Cwd, Cd, Env } = require('./env.js');

const TOOLS = Object.freeze({ Bash, Read, Write, Edit, Glob, Grep, Ls, Cwd, Cd, Env });

module.exports = { TOOLS, ...TOOLS };
