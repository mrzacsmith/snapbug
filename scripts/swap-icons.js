#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const mode = process.argv[2]
if (!['dev', 'prod'].includes(mode)) {
  console.log('Usage: node scripts/swap-icons.js <dev|prod>')
  process.exit(1)
}

const extDir = path.join(__dirname, '..', 'extension')
const sourceDir = mode === 'dev' ? 'icons-dev' : 'icons'
const sizes = [16, 48, 128]

const manifest = JSON.parse(fs.readFileSync(path.join(extDir, 'manifest.json'), 'utf8'))

sizes.forEach(size => {
  manifest.action.default_icon[String(size)] = `${sourceDir}/icon${size}.png`
  manifest.icons[String(size)] = `${sourceDir}/icon${size}.png`
})

fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Switched icons to ${mode} mode (${sourceDir}/)`)
