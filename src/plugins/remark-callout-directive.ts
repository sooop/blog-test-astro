import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { getIconData, iconToSVG } from '@iconify/utils';
import * as lucidePackage from '@iconify-json/lucide';

const lucide = (lucidePackage as any).icons ?? lucidePackage;

/**
 * Converts `remark-directive` container directives into the same callout
 * HTML structure as remark-obsidian-callout.ts, so both syntaxes are
 * handled by one stylesheet.
 *
 * Usage in markdown:
 *   :::note[Title text]
 *   Content here.
 *   :::
 *
 *   :::warning[Collapsible warning]{open}
 *   Collapsible, expanded by default.
 *   :::
 *
 *   :::danger[Hidden by default]{closed}
 *   Collapsible, collapsed by default.
 *   :::
 */

const CALLOUT_TYPES: Record<string, string[]> = {
  note:     ['note'],
  abstract: ['abstract', 'summary', 'tldr'],
  info:     ['info', 'todo'],
  tip:      ['tip', 'hint', 'important'],
  success:  ['success', 'check', 'done'],
  question: ['question', 'help', 'faq'],
  warning:  ['warning', 'caution', 'attention'],
  failure:  ['failure', 'fail', 'missing'],
  danger:   ['danger', 'error'],
  bug:      ['bug'],
  example:  ['example'],
  quote:    ['quote', 'cite'],
};

const LUCIDE_ICON_MAP: Record<string, string> = {
  note:     'pencil',
  abstract: 'clipboard',
  info:     'info',
  tip:      'lightbulb',
  success:  'check-circle',
  question: 'help-circle',
  warning:  'triangle-alert',
  failure:  'x-circle',
  danger:   'alert-triangle',
  bug:      'bug',
  example:  'book-open',
  quote:    'quote',
};

function normalizeType(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [canonical, aliases] of Object.entries(CALLOUT_TYPES)) {
    if (aliases.includes(lower)) return canonical;
  }
  return 'note';
}

function getLucideIconSVG(type: string): string {
  const name = LUCIDE_ICON_MAP[type] || 'pencil';
  const iconData = getIconData(lucide, name);
  if (!iconData) return '';
  const { attributes, body } = iconToSVG(iconData, { width: '18', height: '18' });
  const attrStr = Object.entries(attributes)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<svg ${attrStr} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const remarkCalloutDirective: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'containerDirective', (node: any, index, parent: any) => {
      if (!parent || typeof index !== 'number') return;

      const type = normalizeType(node.name || 'note');
      const attrs = node.attributes ?? {};
      const collapsible = 'open' in attrs || 'closed' in attrs;
      const defaultExpanded = !('closed' in attrs);

      // Title from label attribute or directive content first-child paragraph
      let title = node.attributes?.label || '';
      if (!title && node.children.length > 0) {
        const first = node.children[0];
        if (first.type === 'paragraph' && first.data?.directiveLabel) {
          title = first.children.map((c: any) => c.value ?? '').join('');
          node.children.shift();
        }
      }
      if (!title) title = type.charAt(0).toUpperCase() + type.slice(1);

      const icon = getLucideIconSVG(type);
      const hasContent = node.children.length > 0;

      let html = `<div class="callout callout-${type}" data-type="${type}">
  <div class="callout-header"${collapsible ? ` data-collapsible="true" aria-expanded="${defaultExpanded}"` : ''}>
    <span class="callout-icon">${icon}</span>
    <span class="callout-title">${escapeHtml(title)}</span>${collapsible ? `
    <button class="callout-toggle" aria-label="Toggle callout">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>` : ''}
  </div>`;

      if (hasContent) {
        html += `\n  <div class="callout-content${collapsible && !defaultExpanded ? ' collapsed' : ''}">`;
      }

      const openNode: any = { type: 'html', value: html };
      const closeNode: any = {
        type: 'html',
        value: hasContent ? '  </div>\n</div>' : '</div>',
      };

      parent.children.splice(index, 1, openNode, ...node.children, closeNode);
    });
  };
};

export default remarkCalloutDirective;
