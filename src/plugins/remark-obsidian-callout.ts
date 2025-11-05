import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';
import type { Plugin } from 'unified';

// Obsidian callout type definitions
const CALLOUT_TYPES = {
  note: ['note'],
  abstract: ['abstract', 'summary', 'tldr'],
  info: ['info', 'todo'],
  tip: ['tip', 'hint', 'important'],
  success: ['success', 'check', 'done'],
  question: ['question', 'help', 'faq'],
  warning: ['warning', 'caution', 'attention'],
  failure: ['failure', 'fail', 'missing'],
  danger: ['danger', 'error'],
  bug: ['bug'],
  example: ['example'],
  quote: ['quote', 'cite'],
};

// Normalize type to canonical form
function normalizeType(type: string): string {
  const lowerType = type.toLowerCase();
  for (const [canonical, aliases] of Object.entries(CALLOUT_TYPES)) {
    if (aliases.includes(lowerType)) {
      return canonical;
    }
  }
  return 'note'; // Unknown types default to 'note'
}

// Get Lucide icon SVG for callout type
function getIconSVG(type: string): string {
  const icons: Record<string, string> = {
    note: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    abstract: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    tip: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    question: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    failure: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    danger: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    bug: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
    example: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    quote: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
  };

  return icons[type] || icons.note;
}

const remarkObsidianCallout: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      // Check if first child is a paragraph
      const firstChild = node.children[0];
      if (firstChild?.type !== 'paragraph') return;

      const paragraph = firstChild as Paragraph;
      const firstNode = paragraph.children[0];

      // First node must be text starting with [!
      if (firstNode?.type !== 'text') return;
      const firstText = (firstNode as Text).value;
      if (!firstText.startsWith('[!')) return;

      // Parse the callout header: [!type]+/- optional title
      const headerMatch = firstText.match(/^\[!([^\]]+)\]([+-]?)\s*(.*)/);
      if (!headerMatch) return;

      const [, rawType, toggle, restOfLine] = headerMatch;
      const type = normalizeType(rawType);
      const collapsible = toggle === '+' || toggle === '-';
      const defaultExpanded = toggle !== '-';

      // Title is the rest of the line after [!type]+/-
      // If empty, use capitalized type name
      const title = restOfLine.trim() || rawType.charAt(0).toUpperCase() + rawType.slice(1);

      // Remove the first paragraph (it contains the header)
      node.children.shift();

      // Create callout structure
      const icon = getIconSVG(type);

      const calloutNode: any = {
        type: 'html',
        value: `<div class="callout callout-${type}" data-type="${type}">
  <div class="callout-header"${collapsible ? ` data-collapsible="true" aria-expanded="${defaultExpanded}"` : ''}>
    <span class="callout-icon">${icon}</span>
    <span class="callout-title">${escapeHtml(title)}</span>${collapsible ? `
    <button class="callout-toggle" aria-label="Toggle callout">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </button>` : ''}
  </div>
  <div class="callout-content${collapsible && !defaultExpanded ? ' collapsed' : ''}">`,
      };

      const closeDiv: any = {
        type: 'html',
        value: '  </div>\n</div>',
      };

      // Replace blockquote with callout structure
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
