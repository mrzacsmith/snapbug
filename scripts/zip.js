#!/usr/bin/env node
const { execFileSync } = require('child_process')
const { version } = require('../extension/manifest.json')
const filename = `../snapbug_v${version}.zip`

execFileSync('zip', [
  '-r', filename, '.',
  '-x', 'node_modules/*', '*.test.js', 'vitest.config.js', 'package*',
], { stdio: 'inherit', cwd: __dirname + '/../extension' })

console.log(`\nCreated ${filename}`)
