import { NetworkRequest, Header } from '../../types'
import { formatJson } from './formatters'

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
    item: requests.map((req) => {
      let protocol = 'http'
      let host: string[] = []
      let path: string[] = []
      let query: { key: string; value: string }[] = []

      try {
        const parsedUrl = new URL(req.url)
        protocol = parsedUrl.protocol.replace(':', '')
        host = parsedUrl.hostname.split('.')
        path = parsedUrl.pathname.split('/').filter(Boolean)
        query = Array.from(parsedUrl.searchParams.entries()).map(([key, value]) => ({
          key,
          value,
        }))
      } catch {
        // 安全退回 (fallback)：處理非標準或不合規的 URL
        protocol = 'http'
        host = ['unknown']
        path = [req.url]
        query = []
      }

      return {
        name: getUrlPath(req.url),
        request: {
          method: req.method,
          header: req.requestHeaders
            .filter((h) => !['host', 'content-length'].includes(h.name.toLowerCase()))
            .map((h) => ({ key: h.name, value: h.value })),
          url: {
            raw: req.url,
            protocol,
            host,
            path,
            query,
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
      }
    }),
  }

  return JSON.stringify(collection, null, 2)
}

export function generateMarkdownTable(requests: NetworkRequest[]): string {
  const sections: string[] = []

  requests.forEach((req, index) => {
    const section = [
      `## ${index + 1}. ${req.method} ${getUrlPath(req.url)}`,
      '',
      `**URL:** \`${req.url}\``,
      '',
      `**Status:** ${req.status} ${req.statusText}`,
      '',
      '### cURL',
      '```bash',
      generateCurl(req),
      '```',
      '',
      '### Response',
      '```json',
      req.responseBody ? formatJson(req.responseBody) : '(empty)',
      '```',
      '',
      '---',
      '',
    ]
    sections.push(section.join('\n'))
  })

  return sections.join('\n')
}

export function generateMockoonEnvironment(requests: NetworkRequest[]): string {
  // 將相同 path + method 的請求合併為同一 route 的多個 responses
  const routeMap = new Map<string, { method: string; endpoint: string; responses: NetworkRequest[] }>()

  requests.forEach((req) => {
    const endpoint = getUrlPath(req.url).replace(/^\//, '') // Mockoon endpoint 不含前導斜線
    const key = `${req.method}:${endpoint}`
    if (!routeMap.has(key)) {
      routeMap.set(key, { method: req.method, endpoint, responses: [] })
    }
    routeMap.get(key)!.responses.push(req)
  })

  const routes = Array.from(routeMap.values()).map((route) => ({
    uuid: crypto.randomUUID(),
    documentation: `${route.method} /${route.endpoint}`,
    method: route.method.toLowerCase(),
    endpoint: route.endpoint,
    type: 'http',
    responses: route.responses.map((req) => ({
      uuid: crypto.randomUUID(),
      body: req.responseBody || '',
      latency: 0,
      statusCode: req.status,
      label: `${req.status} ${req.statusText}`,
      headers: req.responseHeaders
        .filter((h) => !['transfer-encoding', 'content-encoding', 'content-length'].includes(h.name.toLowerCase()))
        .map((h) => ({ key: h.name, value: h.value })),
      rules: [],
      sendFile: false,
      filePath: '',
    })),
    enabled: true,
    randomResponse: false,
    sequentialResponse: false,
    alwaysFakeResponses: false,
    callbacks: [],
  }))

  const environment = {
    uuid: crypto.randomUUID(),
    name: 'Exported from Network Enhance',
    endpointPrefix: '',
    port: 3000,
    hostname: '0.0.0.0',
    tlsOptions: {
      enabled: false,
      key: '',
      cert: '',
      pfx: '',
      passphrase: '',
    },
    cors: {
      enabled: true,
      origin: '*',
      headers: 'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With',
      credentials: true,
      methods: 'GET,PUT,POST,DELETE,HEAD,PATCH,OPTIONS',
    },
    headers: [
      { key: 'Content-Type', value: 'application/json' },
    ],
    proxyMode: false,
    proxyHost: '',
    proxyRemovePrefix: false,
    routes,
    data: [],
    callbacks: [],
    rootChildren: routes.map((r) => ({ type: 'route' as const, uuid: r.uuid })),
    variables: [],
    secrets: [],
    settings: {
      logTransaction: false,
      enableAdminApi: false,
      adminApiPort: 6000,
    },
  }

  return JSON.stringify(environment, null, 2)
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

/**
 * 產出 API Mock 匯入用的結構化 JSON
 * 通用格式，不假設 any 其它 request/response 結構
 */
export function generateApiMockExport(requests: NetworkRequest[]): string {
  const items = requests.map((req) => ({
    url: req.url,
    method: req.method,
    status: req.status,
    requestBody: tryParseJson(req.requestBody),
    responseBody: tryParseJson(req.responseBody),
  }))

  return JSON.stringify(items, null, 2)
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
  // 方法 1: 使用 Clipboard API (現代瀏覽器)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch (e) {
      console.warn('Clipboard API failed, trying fallback:', e)
    }
  }

  // 方法 2: 使用 document.execCommand (fallback)
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  textArea.style.top = '-9999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
  } catch (e) {
    console.error('Copy failed:', e)
    throw e
  } finally {
    document.body.removeChild(textArea)
  }
}
