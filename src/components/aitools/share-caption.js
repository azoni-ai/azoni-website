import { toolUrl } from '../../data/aiToolsMeta';

// Em-dashes become a comma so the pasted caption follows the site's plain
// copy rule even when a field came straight from research. Whitespace is
// collapsed because each piece is meant to be one line.
const plain = (value) =>
  String(value == null ? '' : value)
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

const firstOf = (list) => (Array.isArray(list) ? plain(list.find((x) => plain(x))) : '');

// Pure: the share text for a tool. Lines whose source field is empty are
// left out, so a tool with no cons has no "Falls short" line.
export const buildShareCaption = (tool) => {
  if (!tool) return '';
  const name = plain(tool.name);
  const verdict = plain(tool.verdict);
  const head = name && verdict ? `${name}: ${verdict}` : name || verdict;
  const pro = firstOf(tool.pros);
  const con = firstOf(tool.cons);
  const middle = [pro && `Works well: ${pro}`, con && `Falls short: ${con}`]
    .filter(Boolean)
    .join('\n');
  const link = tool.slug ? `Full notes: ${toolUrl(tool.slug)}` : '';
  return [head, middle, link].filter(Boolean).join('\n\n');
};
