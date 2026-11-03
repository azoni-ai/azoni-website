// "T-Mobile" can break after its hyphen and leave "T-" at the end of a line.
// Text from the data files goes through this so the name stays on one line,
// as the pages' own copy does with a nowrap span.
const NAMES = /(T-Mobile)/;

export default function keepNamesTogether(text) {
  if (typeof text !== 'string' || !NAMES.test(text)) return text;
  return text.split(NAMES).map((part, index) => (index % 2
    ? <span key={index} style={{ whiteSpace: 'nowrap' }}>{part}</span>
    : part));
}
