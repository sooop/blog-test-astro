import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';
import type { Plugin } from 'unified';
import { getIconData, iconToSVG } from '@iconify/utils';
import * as lucidePackage from '@iconify-json/lucide';

const lucide = (lucidePackage as any).icons ?? lucidePackage;

// Obsidian callout type definitions
const CALLOUT_TYPES = {
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

function normalizeType(type: string): string {
  const lowerType = type.toLowerCase();
  for (const [canonical, aliases] of Object.entries(CALLOUT_TYPES)) {
    if (aliases.includes(lowerType)) return canonical;
  }
  return 'note';
}

function getIconSVG(type: string): string {
  const name = LUCIDE_ICON_MAP[type] || 'pencil';
  const iconData = getIconData(lucide, name);
  if (!iconData) return '';
  const { attributes, body } = iconToSVG(iconData, { width: '18', height: '18' });
  const attrStr = Object.entries(attributes)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  return `<svg ${attrStr} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

const remarkObsidianCallout: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      const firstChild = node.children[0];
      if (firstChild?.type !== 'paragraph') return;

      const paragraph = firstChild as Paragraph;
      const firstNode = paragraph.children[0];

      if (firstNode?.type !== 'text') return;
      const firstText = (firstNode as Text).value;
      if (!firstText.startsWith('[!')) return;

      const headerMatch = firstText.match(/^\[!([^\]]+)\]([+-]?)\s*(.*)/);
      if (!headerMatch) return;

      const [fullMatch, rawType, toggle, restOfLine] = headerMatch;
      const type = normalizeType(rawType);
      const collapsible = toggle === '+' || toggle === '-';
      const defaultExpanded = toggle !== '-';

      const title = restOfLine.trim() || rawType.charAt(0).toUpperCase() + rawType.slice(1);

      const remainingText = firstText.substring(fullMatch.length).trim();

      if (remainingText || paragraph.children.length > 1) {
        (firstNode as Text).value = firstText.substring(fullMatch.length).trimStart();
        if ((firstNode as Text).value === '' && paragraph.children.length > 1) {
          paragraph.children.shift();
        }
        if (
          paragraph.children.length === 0 ||
          (paragraph.children.length === 1 &&
            paragraph.children[0].type === 'text' &&
            (paragraph.children[0] as Text).value.trim() === '')
        ) {
          node.children.shift();
        }
      } else {
        node.children.shift();
      }

      const icon = getIconSVG(type);
      const hasContent = node.children.length > 0;

      let headerHTML = `<div class="callout callout-${type}" data-type="${type}">
  <div class="callout-header"${collapsible ? ` data-collapsible="true" aria-expanded="${defaultExpanded}"` : ''}>
    <span class="callout-icon">${icon}</span>
    <span class="callout-title">${escapeHtml(title)}</span>${collapsible ? `
    <button class="callout-toggle" aria-label="Toggle callout">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>` : ''}
  </div>`;

      if (hasContent) {
        headerHTML += `\n  <div class="callout-content${collapsible && !defaultExpanded ? ' collapsed' : ''}">`;
      }

      const calloutNode: any = { type: 'html', value: headerHTML };
      const closeDiv: any = {
        type: 'html',
        value: hasContent ? '  </div>\n</div>' : '</div>',
      };

      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1, calloutNode, ...node.children, closeDiv);
      }
    });
  };
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default remarkObsidianCallout;
