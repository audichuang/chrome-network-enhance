import { useState, useEffect, useCallback, useRef } from 'react'
import { NetworkRequest, Header } from '../../types'

let requestIdCounter = 0

// 判斷是否為 Fetch/XHR 類型的請求
function isApiRequest(mimeType: string, url: string): boolean {
  const apiMimeTypes = [
    'application/json',
    'application/xml',
    'text/xml',
    'text/plain',
    'text/html',
  ]

  // 檢查 MIME type
  if (apiMimeTypes.some(type => mimeType.includes(type))) {
    return true
  }

  // 排除靜態資源
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot']
  const urlPath = new URL(url).pathname.toLowerCase()
  if (staticExtensions.some(ext => urlPath.endsWith(ext))) {
    return false
  }

  return true
}

export function useNetworkRequests() {
  const [requests, setRequests] = useState<NetworkRequest[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const isRecordingRef = useRef(isRecording)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.devtools?.network) {
      console.warn('Chrome DevTools API not available')
      return
    }

    const handleRequestFinished = (request: chrome.devtools.network.Request) => {
      if (!isRecordingRef.current) return

      const id = `req-${++requestIdCounter}`
      const harEntry = request as unknown as {
        request: {
          url: string
          method: string
          headers: Header[]
          postData?: { text?: string }
        }
        response: {
          status: number
          statusText: string
          headers: Header[]
          content: { size: number; mimeType: string }
        }
        time: number
        startedDateTime: string
        serverIPAddress?: string
        _resourceType?: string
      }

      const mimeType = harEntry.response.content.mimeType || ''
      const url = harEntry.request.url

      // 取得資源類型
      const resourceType = harEntry._resourceType || 'other'

      const networkRequest: NetworkRequest = {
        id,
        url,
        method: harEntry.request.method,
        status: harEntry.response.status,
        statusText: harEntry.response.statusText,
        time: harEntry.time || 0,
        size: harEntry.response.content.size || 0,
        mimeType,
        resourceType,
        requestHeaders: harEntry.request.headers || [],
        responseHeaders: harEntry.response.headers || [],
        requestBody: harEntry.request.postData?.text || null,
        responseBody: null,
        startedDateTime: harEntry.startedDateTime,
        serverIPAddress: harEntry.serverIPAddress,
      }

      request.getContent((content) => {
        networkRequest.responseBody = content
        setRequests((prev) => [...prev, networkRequest])
      })
    }

    chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished)

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handleRequestFinished)
    }
  }, [])

  const clearRequests = useCallback(() => {
    setRequests([])
  }, [])

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev)
  }, [])

  return { requests, clearRequests, isRecording, toggleRecording }
}
