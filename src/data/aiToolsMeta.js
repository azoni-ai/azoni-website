// The AI Tools series: one place to rename it. The URL path stays stable even if
// the label changes, so shared links keep working.
//
// The edge function netlify/edge-functions/ai-tools-og.js mirrors `title` and
// `description` for link previews (it cannot import from src). Update both.
// Unlisted while the series is being set up: no nav link, out of the sitemap,
// and noindex on both pages. The URLs still work for anyone who has them, so
// they can be shared for review. To launch it publicly: set this to false and
// add <loc>https://azoni.ai/ai-tools</loc> back to public/sitemap.xml.
const UNLISTED = true;

export const AI_TOOLS = {
  label: 'AI Tools',
  title: 'AI Tools',
  path: '/ai-tools',
  unlisted: UNLISTED,
  feedPath: '/ai-tools/feed.xml',
  tagline: 'Notes on AI tools I have tried: what each one does, where it works well, where it falls short, and what people are saying.',
  description: 'Notes on AI tools: what each one does, pros, cons, what people are saying, and my take.',
};

export const AI_TOOL_CATEGORIES = [
  'Chat assistants',
  'Agents',
  'Coding',
  'Writing',
  'Image',
  'Video',
  'Audio and voice',
  'Search and research',
  'Productivity',
  'Data and analytics',
  'Infrastructure and APIs',
  'Other',
];

export const SHARE_VENUES = ['LinkedIn', 'X', 'Other'];

export const toolUrl = (slug) => `https://azoni.ai${AI_TOOLS.path}/${slug}`;
