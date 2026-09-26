export function readDiaryTitle(source, fallback) {
  const heading = source.replace(/^\uFEFF/, '').match(/^#\s+([^\r\n]+)/)?.[1];
  return heading?.replace(/^\d{4}-\d{2}-\d{2}\s+/, '').trim() || fallback;
}

export function escapeDiaryTitle(title) {
  return title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
