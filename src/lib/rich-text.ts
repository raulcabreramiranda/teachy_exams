const commentsPattern = /<!--[\s\S]*?-->/g;
const scriptPattern = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const styleTagPattern = /<style[\s\S]*?>[\s\S]*?<\/style>/gi;
const eventHandlerPattern =
  /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const styleAttributePattern =
  /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const javascriptProtocolPattern = /javascript:/gi;

export function sanitizeRichTextHtml(value: string) {
  return value
    .replace(commentsPattern, "")
    .replace(scriptPattern, "")
    .replace(styleTagPattern, "")
    .replace(eventHandlerPattern, "")
    .replace(styleAttributePattern, "")
    .replace(javascriptProtocolPattern, "")
    .trim();
}

export function getRichTextPreview(value: string) {
  return sanitizeRichTextHtml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|ul|ol)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextEmpty(value: string) {
  return getRichTextPreview(value).length === 0;
}
