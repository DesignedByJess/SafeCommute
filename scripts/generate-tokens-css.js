const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'design-tokens.tokens.json');
const OUTPUT = path.join(ROOT, 'frontend', 'src', 'styles', 'tokens.css');

const tokens = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));

const lines = [':root {'];

// ── Color Roles ──────────────────────────────────────────────────────────────
for (const [rawName, token] of Object.entries(tokens.color)) {
  const name = rawName
    .toLowerCase()
    .replace(/ for (hover state|backgrounds)/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const hex = token.value;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = parseInt(hex.slice(7, 9), 16) / 255;

  const value = a < 1
    ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
    : `#${hex.slice(1, 7)}`;

  lines.push(`  --color-${name}: ${value};`);
}

lines.push('');

// ── Typography ───────────────────────────────────────────────────────────────
for (const [category, styles] of Object.entries(tokens.font)) {
  for (const [styleName, styleDef] of Object.entries(styles)) {
    const prefix = `--${category}-${styleName.toLowerCase().replace(/\s+/g, '-')}`;
    const v = styleDef.value;

    lines.push(`  ${prefix}-font-family: '${v.fontFamily}';`);
    lines.push(`  ${prefix}-font-size: ${v.fontSize}px;`);
    lines.push(`  ${prefix}-font-weight: ${v.fontWeight};`);
    lines.push(`  ${prefix}-line-height: ${v.lineHeight}px;`);
    lines.push(`  ${prefix}-letter-spacing: ${v.letterSpacing}px;`);
    lines.push(`  ${prefix}-font-style: ${v.fontStyle};`);
    lines.push(`  ${prefix}-text-decoration: ${v.textDecoration};`);

    if (v.textCase === 'uppercase') {
      lines.push(`  ${prefix}-text-transform: uppercase;`);
    }
  }
}

lines.push('}');

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, lines.join('\n') + '\n');

console.log(`✓ Generated ${OUTPUT}`);
