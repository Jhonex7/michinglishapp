// Pure helpers to read the text of an info.json (browser + Node).

/** Removes the invisible BOM some Windows editors add (browsers ignore it too). */
export const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/** Readable explanation for the most common JSON mistakes students make. */
export const explainJsonError = (text, error) => {
  const tips = [];
  if (!text.trim()) tips.push('the file is empty');
  if (/,\s*[}\]]/.test(text)) tips.push('remove the comma before } or ]');
  if (/[“”‘’]/.test(text)) tips.push('replace curly quotes “ ” with straight quotes "');
  if (/^\s*\/\//m.test(text) || /\/\*/.test(text)) tips.push('JSON does not allow comments (// or /* */)');
  if (/'[^'\n]*'\s*:/.test(text)) tips.push('keys and texts need double quotes "", not single quotes');
  return `invalid JSON (${error.message})${tips.length ? `. Tip: ${tips.join('; ')}` : ''}`;
};

/** Parses the text of an info.json: { data, text } or { error }. */
export const parseInfoText = (raw) => {
  const text = stripBom(raw);
  try {
    return { data: JSON.parse(text), text };
  } catch (error) {
    return { error: explainJsonError(text, error) };
  }
};
