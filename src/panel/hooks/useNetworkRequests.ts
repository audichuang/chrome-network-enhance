import { useState, useEffect, useCallback, useRef } from 'react'
import { NetworkRequest, Header } from '../../types'

let requestIdCounter = 0

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
      }

      const networkRequest: NetworkRequest = {
        id,
        url: harEntry.request.url,
        method: harEntry.request.method,
        status: harEntry.response.status,
        statusText: harEntry.response.statusText,
        time: harEntry.time || 0,
        size: harEntry.response.content.size || 0,
        mimeType: harEntry.response.content.mimeType || '',
        requestHeaders: harEntry.request.headers || [],
        responseHeaders: harEntry.response.headers || [],
        requestBody: harEntry.request.postData?.text || null,
        responseBody: null,
        startedDateTime: harEntry.startedDateTime,
        serverIPAddress: harEntry.serverIPAddress,
      }

      request.getContent((content, encoding) => {
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
