import { describe, it, expect } from 'vitest'
import { splitHighlight } from './highlight'

describe('splitHighlight', () => {
  it('大小寫不敏感地標記匹配段並保留原始大小寫', () => {
    expect(splitHighlight('Hello World', 'world')).toEqual([
      { text: 'Hello ', match: false },
      { text: 'World', match: true },
    ])
  })

  it('highlight 為空白時整段回傳為非 match', () => {
    expect(splitHighlight('hello', '   ')).toEqual([{ text: 'hello', match: false }])
  })

  it('逃逸正則特殊字元，只匹配字面值', () => {
    expect(splitHighlight('a.b a+b', 'a.b')).toEqual([
      { text: 'a.b', match: true },
      { text: ' a+b', match: false },
    ])
  })

  it('標記所有多次出現的匹配（無 lastIndex 殘留問題）', () => {
    expect(splitHighlight('xax', 'x')).toEqual([
      { text: 'x', match: true },
      { text: 'a', match: false },
      { text: 'x', match: true },
    ])
  })
})
