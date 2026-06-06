import { describe, it, expect } from 'vitest'
import { generateCurl } from './copyUtils'
import { NetworkRequest } from '../../types'

function makeRequest(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    id: 'req-1',
    url: 'https://api.example.com/users',
    method: 'GET',
    status: 200,
    statusText: 'OK',
    time: 0,
    size: 0,
    mimeType: 'application/json',
    resourceType: 'fetch',
    requestHeaders: [],
    responseHeaders: [],
    requestBody: null,
    responseBody: null,
    startedDateTime: '',
    ...overrides,
  }
}

describe('generateCurl', () => {
  it('用 POSIX 安全序列逃逸 header value 中的單引號', () => {
    const req = makeRequest({
      requestHeaders: [{ name: 'X-Owner', value: "O'Brien" }],
    })
    const curl = generateCurl(req)

    // POSIX 單引號字串內反斜線無逃逸作用，正確逃逸序列是 '\''
    expect(curl).toContain("-H 'X-Owner: O'\\''Brien'")
    // 不應使用無效的反斜線逃逸（貼到 shell 會語法錯誤）
    expect(curl).not.toContain("O\\'Brien")
  })

  it('逃逸 URL 中的單引號', () => {
    const req = makeRequest({ url: "https://x.com/a'b" })
    const curl = generateCurl(req)
    expect(curl).toContain("curl 'https://x.com/a'\\''b'")
  })

  it('逃逸 request body 中的單引號', () => {
    const req = makeRequest({ method: 'POST', requestBody: `{"name":"O'Brien"}` })
    const curl = generateCurl(req)
    expect(curl).toContain(`--data-raw '{"name":"O'\\''Brien"}'`)
  })

  it('過濾 content-length header、保留其他 header', () => {
    const req = makeRequest({
      requestHeaders: [
        { name: 'Content-Length', value: '42' },
        { name: 'Authorization', value: 'Bearer xyz' },
      ],
    })
    const curl = generateCurl(req)
    expect(curl).not.toContain('Content-Length')
    expect(curl).toContain("-H 'Authorization: Bearer xyz'")
  })

  it('無 request body 時不產生 --data-raw', () => {
    const curl = generateCurl(makeRequest({ requestBody: null }))
    expect(curl).not.toContain('--data-raw')
  })

  it('包含 -X 方法與基本格式', () => {
    const curl = generateCurl(makeRequest({ method: 'DELETE', url: 'https://x.com/a' }))
    expect(curl).toContain("curl 'https://x.com/a'")
    expect(curl).toContain('-X DELETE')
  })
})
