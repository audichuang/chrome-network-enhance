import { NetworkRequest, Header } from '../../types'

export function generateCurl(request: NetworkRequest): string {
  const parts = [`curl '${request.url}'`]

  parts.push(`-X ${request.method}`)

  request.requestHeaders.forEach((header) => {
    if (header.name.toLowerCase() !== 'content-length') {
      parts.push(`-H '${header.name}: ${header.value.replace(/'/g, "\\'")}'`)
    }
  })

  if (request.requestBody) {
    parts.push(`--data-raw '${request.requestBody.replace(/'/g, "\\'")}'`)
  }

  return parts.join(' \\\n  ')
}

export function generatePostmanCollection(requests: NetworkRequest[]): string {
  const collection = {
    info: {
      name: 'Exported from Network Enhance',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: requests.map((req) => ({
      name: getUrlPath(req.url),
      request: {
        method: req.method,
        header: req.requestHeaders
          .filter((h) => !['host', 'content-length'].includes(h.name.toLowerCase()))
          .map((h) => ({ key: h.name, value: h.value })),
        url: {
          raw: req.url,
          protocol: new URL(req.url).protocol.replace(':', ''),
          host: new URL(req.url).hostname.split('.'),
          path: new URL(req.url).pathname.split('/').filter(Boolean),
          query: Array.from(new URL(req.url).searchParams.entries()).map(([key, value]) => ({
            key,
            value,
          })),
        },
        body: req.requestBody
          ? {
              mode: 'raw',
              raw: req.requestBody,
              options: { raw: { language: 'json' } },
            }
          : undefined,
      },
      response: [],
    })),
  }

  return JSON.stringify(collection, null, 2)
}

export function generateMarkdownTable(requests: NetworkRequest[]): string {
  const lines = [
    '| Method | URL | Status | Response |',
    '|--------|-----|--------|----------|',
  ]

  requests.forEach((req) => {
    const url = truncateUrl(req.url, 60)
    const response = req.responseBody ? truncateResponse(req.responseBody, 100) : '-'
    lines.push(`| ${req.method} | ${url} | ${req.status} | ${response} |`)
  })

  return lines.join('\n')
}

export function formatHeaders(headers: Header[]): string {
  return headers.map((h) => `${h.name}: ${h.value}`).join('\n')
}

export function formatResponsesAsJson(requests: NetworkRequest[]): string {
  const responses = requests.map((req) => ({
    url: req.url,
    method: req.method,
    status: req.status,
    response: tryParseJson(req.responseBody),
  }))

  return JSON.stringify(responses, null, 2)
}

function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function truncateUrl(url: string, maxLength: number): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength - 3) + '...'
}

function truncateResponse(response: string, maxLength: number): string {
  const cleaned = response.replace(/\n/g, ' ').replace(/\|/g, '\\|')
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength - 3) + '...'
}

function tryParseJson(str: string | null): unknown {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return str
  }
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
