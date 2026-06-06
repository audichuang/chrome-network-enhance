export interface HighlightPart {
  text: string
  match: boolean
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 依 highlight 詞把 text 切成多段，標記哪些段命中（大小寫不敏感、保留原始大小寫）。
 * 以無狀態的 toLowerCase 相等比較判斷命中，避免帶 /g 的 regex.test 因 lastIndex 殘留而誤判。
 */
export function splitHighlight(text: string, highlight: string): HighlightPart[] {
  if (!highlight.trim()) {
    return [{ text, match: false }]
  }

  const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi')
  const lower = highlight.toLowerCase()

  return text
    .split(regex)
    .filter((segment) => segment !== '')
    .map((segment) => ({ text: segment, match: segment.toLowerCase() === lower }))
}
