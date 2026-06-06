import { splitHighlight } from '../utils/highlight'

interface HighlightTextProps {
  text: string
  highlight: string
}

export default function HighlightText({ text, highlight }: HighlightTextProps) {
  const parts = splitHighlight(text, highlight)

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-yellow-400/70 text-black rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  )
}
