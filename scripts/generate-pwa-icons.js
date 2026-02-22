#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates PNG icons from SVG for all PWA sizes using Sharp
 * 
 * Prerequisites:
 *   npm install -D sharp
 * 
 * Usage:
 *   node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

// Required PWA icon sizes
const SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');

async function generateIcons() {
  console.log('🎨 Generating PWA Icons...\n');

  // Check if sharp is available
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('❌ Sharp is not installed. Run: npm install -D sharp');
    console.log('\nAlternative: Use an online converter:');
    console.log('- https://www.figma.com/ (import SVG and export PNGs)');
    console.log('- https://convertio.co/svg-png/');
    process.exit(1);
  }

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  // Check if SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`❌ SVG icon not found at ${SVG_PATH}`);
    process.exit(1);
  }

  // Generate each size
  for (const { size, name } of SIZES) {
    const outputPath = path.join(ICONS_DIR, name);
    
    try {
      await sharp(SVG_PATH)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 233, g: 30, b: 140, alpha: 1 }, // Pink Beam primary color
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n🎉 PWA icons generated successfully!');
  console.log(`📁 Location: ${ICONS_DIR}`);
}

// Run if called directly
if (require.main === module) {
  generateIcons().catch((error) => {
    console.error('Failed to generate icons:', error);
    process.exit(1);
  });
}

module.exports = { generateIcons };
