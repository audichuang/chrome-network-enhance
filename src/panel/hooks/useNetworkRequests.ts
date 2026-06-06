import { useState, useEffect, useCallback, useRef } from 'react'
import { NetworkRequest, Header } from '../../types'

let requestIdCounter = 0

export function useNetworkRequests() {
  const [requests, setRequests] = useState<NetworkRequest[]>([])
  const [isRecording, setIsRecording] = useState(true)
  const isRecordingRef = useRef(isRecording)

  // 用於暫存原生的 chrome.devtools.network.Request 引用，以便後續點擊時懶載入 response body
  const requestRefs = useRef<Map<string, chrome.devtools.network.Request>>(new Map())

  // 用於批次更新請求，避免頻繁渲染造成卡頓
  const pendingRequestsRef = useRef<NetworkRequest[]>([])
  const updateTimerRef = useRef<number | null>(null)

  // 用於阻擋同一個 ID 重複請求 response body 的 Promise 快取 (in-flight guard)
  const inflightBodyRequestsRef = useRef<Map<string, Promise<string | null>>>(new Map())

  // 快取最新的 requests 狀態，以避免 fetchResponseBody callback 重複生成
  const requestsRef = useRef<NetworkRequest[]>([])
  useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  // 清除定時器
  const clearUpdateTimer = () => {
    if (updateTimerRef.current !== null) {
      clearTimeout(updateTimerRef.current)
      updateTimerRef.current = null
    }
  }

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
        responseBody: null, // 初始化為 null，點選時才懶載入
        startedDateTime: harEntry.startedDateTime,
        serverIPAddress: harEntry.serverIPAddress,
      }

      // 保存原生 Request 引用
      requestRefs.current.set(id, request)

      // 加入批次更新佇列
      pendingRequestsRef.current.push(networkRequest)

      if (updateTimerRef.current === null) {
        updateTimerRef.current = window.setTimeout(() => {
          const newReqs = [...pendingRequestsRef.current]
          pendingRequestsRef.current = []
          updateTimerRef.current = null
          if (newReqs.length > 0) {
            setRequests((prev) => [...prev, ...newReqs])
          }
        }, 150)
      }
    }

    chrome.devtools.network.onRequestFinished.addListener(handleRequestFinished)

    return () => {
      chrome.devtools.network.onRequestFinished.removeListener(handleRequestFinished)
      clearUpdateTimer()
    }
  }, [])

  // 懶載入 Response Body
  const fetchResponseBody = useCallback((id: string): Promise<string | null> => {
    // 1. 先確認是否已經載入過
    const target = requestsRef.current.find((r) => r.id === id)
    if (target && target.responseBody !== null) {
      return Promise.resolve(target.responseBody)
    }

    // 2. 檢查是否有正在進行的載入請求 (In-flight guard)
    const inflight = inflightBodyRequestsRef.current.get(id)
    if (inflight) {
      return inflight
    }

    // 3. 獲取原生的 Request 引用
    const nativeRequest = requestRefs.current.get(id)
    if (!nativeRequest) {
      return Promise.resolve(null)
    }

    // 4. 建立新的 Promise 進行非同步獲取並儲存
    const promise = new Promise<string | null>((resolve) => {
      nativeRequest.getContent((content) => {
        inflightBodyRequestsRef.current.delete(id)
        // content == null 代表 getContent 失敗（Chrome DevTools API 無顯式錯誤訊號）。
        // 保留 responseBody = null 以允許之後重試，不要寫入 '' 毒化快取（否則會靜默產出空 mock）。
        // 注意：204/304/HEAD 等合法空 body 的 content 為 ''，仍走下方正常路徑寫入。
        if (content == null) {
          console.warn(`getContent failed for ${id}; response body left unloaded for retry.`)
          resolve(null)
          return
        }
        setRequests((currentRequests) =>
          currentRequests.map((r) =>
            r.id === id ? { ...r, responseBody: content } : r
          )
        )
        resolve(content)
      })
    })

    inflightBodyRequestsRef.current.set(id, promise)
    return promise
  }, [])

  const clearRequests = useCallback(() => {
    clearUpdateTimer()
    pendingRequestsRef.current = []
    requestRefs.current.clear()
    inflightBodyRequestsRef.current.clear()
    setRequests([])
  }, [])

  const toggleRecording = useCallback(() => {
    setIsRecording((prev) => !prev)
  }, [])

  return { requests, clearRequests, isRecording, toggleRecording, fetchResponseBody }
}
