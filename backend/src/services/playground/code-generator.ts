import type { ComponentNode, PlaygroundConfig } from '../../middleware/validate/playground.schema';

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

function serializeProps(props: Record<string, string | number | boolean | Record<string, string | number>> | undefined): string {
  if (!props || Object.keys(props).length === 0) return '';

  const entries: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style' && typeof value === 'object' && value !== null) {
      const styleEntries = Object.entries(value as Record<string, string | number>)
        .map(([k, v]) => `${k}: ${typeof v === 'number' ? v : `'${escapeString(String(v))}'`}`)
        .join(', ');
      entries.push(`style={{ ${styleEntries} }}`);
    } else if (typeof value === 'boolean') {
      if (value) entries.push(key);
      else entries.push(`${key}={false}`);
    } else if (typeof value === 'number') {
      entries.push(`${key}={${value}}`);
    } else if (typeof value === 'string') {
      entries.push(`${key}="${escapeString(value)}"`);
    }
  }

  return entries.length > 0 ? ' ' + entries.join(' ') : '';
}

function renderNode(node: ComponentNode, indent: number = 2): string {
  const pad = ' '.repeat(indent);
  const tag = node.type;
  const propsStr = serializeProps(node.props);

  if (!node.children) {
    return `${pad}<${tag}${propsStr} />`;
  }

  if (typeof node.children === 'string') {
    return `${pad}<${tag}${propsStr}>${escapeString(node.children)}</${tag}>`;
  }

  if (Array.isArray(node.children) && node.children.length === 0) {
    return `${pad}<${tag}${propsStr} />`;
  }

  const childrenStr = (node.children as ComponentNode[])
    .map(child => renderNode(child, indent + 2))
    .join('\n');

  return `${pad}<${tag}${propsStr}>\n${childrenStr}\n${pad}</${tag}>`;
}

export interface GeneratedCode {
  jsx: string;
  css: string;
}

export function generateCode(config: PlaygroundConfig): GeneratedCode {
  const jsxContent = renderNode(config.component, 4);

  const jsx = `import React from 'react';

export default function PlaygroundComponent() {
  return (
${jsxContent}
  );
}
`;

  const css = config.css || '';

  return { jsx, css };
}

export function generateEntryPoint(config: PlaygroundConfig): string {
  const { jsx, css } = generateCode(config);

  const cssImport = css ? `import './styles.css';\n\n` : '';

  return `${cssImport}${jsx}

import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
`;
}

export function generateStylesheet(css: string): string {
  return `@import 'tailwindcss';

${css}
`;
}
