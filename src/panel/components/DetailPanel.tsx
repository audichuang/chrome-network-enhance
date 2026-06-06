import { useState, useMemo } from 'react'
import { NetworkRequest } from '../../types'
import { formatJson } from '../utils/formatters'
import { copyToClipboard } from '../utils/copyUtils'

interface DetailPanelProps {
  request: NetworkRequest
  onClose: () => void
  onToast: (message: string, type?: 'success' | 'error') => void
}

type TabType = 'headers' | 'payload' | 'preview' | 'response'

const TABS: { key: TabType; label: string }[] = [
  { key: 'headers', label: 'Headers' },
  { key: 'payload', label: 'Payload' },
  { key: 'preview', label: 'Preview' },
  { key: 'response', label: 'Response' },
]

export default function DetailPanel({ request, onClose, onToast }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('preview')

  const handleCopy = async (content: string, label: string) => {
    try {
      await copyToClipboard(formatJson(content))
      onToast(`${label} copied!`, 'success')
    } catch (err) {
      console.error('Copy failed:', err)
      onToast('Copy failed — check clipboard permission', 'error')
    }
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-700 bg-[#1e1e1e] min-w-0">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-700 bg-[#252526] flex-shrink-0">
        <button
          onClick={onClose}
          className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#3c3c3c] transition-colors"
          title="Close"
        >
          ✕
        </button>
        <div className="flex flex-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 text-xs whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-blue-400 border-blue-400 bg-[#1e1e1e]'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#2a2d2e]'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-0 min-h-0">
        {activeTab === 'headers' && <HeadersTab request={request} />}
        {activeTab === 'payload' && (
          <JsonTab
            content={request.requestBody}
            emptyMessage="No request payload"
            onCopy={() => handleCopy(request.requestBody || '', 'Payload')}
          />
        )}
        {activeTab === 'preview' && <PreviewTab request={request} />}
        {activeTab === 'response' && (
          <JsonTab
            content={request.responseBody}
            emptyMessage="No response body"
            onCopy={() => handleCopy(request.responseBody || '', 'Response')}
            loadable
          />
        )}
      </div>
    </div>
  )
}

/* ─── Headers Tab ─── */
function HeadersTab({ request }: { request: NetworkRequest }) {
  return (
    <div className="text-xs">
      {/* General */}
      <Section title="General" defaultOpen>
        <InfoRow label="Request URL" value={request.url} />
        <InfoRow label="Request Method" value={request.method} />
        <InfoRow label="Status Code" value={`${request.status} ${request.statusText}`} />
        {request.serverIPAddress && <InfoRow label="Remote Address" value={request.serverIPAddress} />}
      </Section>

      {/* Response Headers */}
      <Section title="Response Headers" defaultOpen>
        {request.responseHeaders.map((h, i) => (
          <InfoRow key={i} label={h.name} value={h.value} />
        ))}
      </Section>

      {/* Request Headers */}
      <Section title="Request Headers" defaultOpen>
        {request.requestHeaders.map((h, i) => (
          <InfoRow key={i} label={h.name} value={h.value} />
        ))}
      </Section>
    </div>
  )
}

/* ─── Preview Tab (collapsible JSON tree) ─── */
function PreviewTab({ request }: { request: NetworkRequest }) {
  // useMemo 必須在任何 early return 之前（Rules of Hooks）；只在 responseBody 變更時重 parse。
  const parsed = useMemo<
    | { state: 'loading' }
    | { state: 'empty' }
    | { state: 'raw' }
    | { state: 'ok'; data: unknown }
  >(() => {
    if (request.responseBody === null) return { state: 'loading' }
    if (request.responseBody === '') return { state: 'empty' }
    try {
      return { state: 'ok', data: JSON.parse(request.responseBody) }
    } catch {
      return { state: 'raw' }
    }
  }, [request.responseBody])

  if (parsed.state === 'loading') {
    return <LoadingState message="Loading response…" />
  }
  if (parsed.state === 'empty') {
    return <EmptyState message="No response data" />
  }
  if (parsed.state === 'raw') {
    return (
      <div className="p-3">
        <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-300">
          {request.responseBody}
        </pre>
      </div>
    )
  }
  return (
    <div className="p-3 text-xs font-mono">
      <JsonTree data={parsed.data} level={0} />
    </div>
  )
}

/* ─── JSON Tab (formatted text + copy) ─── */
function JsonTab({
  content,
  emptyMessage,
  onCopy,
  loadable,
}: {
  content: string | null
  emptyMessage: string
  onCopy: () => void
  loadable?: boolean
}) {
  // 使用 useMemo 快取格式化 JSON 操作，避免大 JSON 阻塞主線程
  const formatted = useMemo(() => formatJson(content), [content])

  // 懶載入內容（response body）尚未載入時 content 為 null → 顯示 loading 而非假空狀態
  if (content === null && loadable) {
    return <LoadingState message="Loading response…" />
  }
  if (!content) {
    return <EmptyState message={emptyMessage} />
  }

  return (
    <div className="relative">
      <button
        onClick={onCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-[#3c3c3c] hover:bg-[#505050] text-gray-300 rounded border border-gray-600 transition-colors z-10"
        title="Copy formatted JSON"
      >
        📋 Copy
      </button>
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all text-gray-300 leading-5">
        {formatted}
      </pre>
    </div>
  )
}

/* ─── Collapsible JSON Tree ─── */
const BREADTH_LIMIT = 100

function JsonTree({ data, level, keyName }: { data: unknown; level: number; keyName?: string }) {
  const [collapsed, setCollapsed] = useState(level > 1)
  // 廣度截斷：大陣列/大物件只先渲染前 N 筆，避免一次掛載海量 DOM 造成凍結
  const [showAll, setShowAll] = useState(false)
  const indent = level * 16

  if (data === null) {
    return (
      <div style={{ paddingLeft: indent }}>
        {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
        {keyName !== undefined && <span className="text-gray-400">: </span>}
        <span className="text-gray-400">null</span>
      </div>
    )
  }

  if (typeof data === 'boolean') {
    return (
      <div style={{ paddingLeft: indent }}>
        {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
        {keyName !== undefined && <span className="text-gray-400">: </span>}
        <span className="text-blue-400">{String(data)}</span>
      </div>
    )
  }

  if (typeof data === 'number') {
    return (
      <div style={{ paddingLeft: indent }}>
        {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
        {keyName !== undefined && <span className="text-gray-400">: </span>}
        <span className="text-green-400">{data}</span>
      </div>
    )
  }

  if (typeof data === 'string') {
    return (
      <div style={{ paddingLeft: indent }}>
        {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
        {keyName !== undefined && <span className="text-gray-400">: </span>}
        <span className="text-orange-300">"{data}"</span>
      </div>
    )
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ paddingLeft: indent }}>
          {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
          {keyName !== undefined && <span className="text-gray-400">: </span>}
          <span className="text-gray-400">[]</span>
        </div>
      )
    }

    const shown = showAll ? data : data.slice(0, BREADTH_LIMIT)
    return (
      <div style={{ paddingLeft: indent }}>
        <span
          className="cursor-pointer select-none hover:text-white text-gray-400 inline-flex items-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="w-3 inline-block text-[10px]">{collapsed ? '▶' : '▼'}</span>
          {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
          {keyName !== undefined && <span className="text-gray-400">: </span>}
          {collapsed && (
            <span className="text-gray-400 ml-1">Array({data.length})</span>
          )}
        </span>
        {!collapsed && (
          <div>
            {shown.map((item, i) => (
              <JsonTree key={i} data={item} level={level + 1} keyName={String(i)} />
            ))}
            {data.length > BREADTH_LIMIT && !showAll && (
              <button
                style={{ paddingLeft: (level + 1) * 16 }}
                className="block text-blue-400 hover:text-blue-300 text-xs py-0.5"
                onClick={() => setShowAll(true)}
              >
                … 顯示其餘 {data.length - BREADTH_LIMIT} 筆
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) {
      return (
        <div style={{ paddingLeft: indent }}>
          {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
          {keyName !== undefined && <span className="text-gray-400">: </span>}
          <span className="text-gray-400">{'{}'}</span>
        </div>
      )
    }

    const shownEntries = showAll ? entries : entries.slice(0, BREADTH_LIMIT)
    return (
      <div style={{ paddingLeft: indent }}>
        <span
          className="cursor-pointer select-none hover:text-white text-gray-400 inline-flex items-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="w-3 inline-block text-[10px]">{collapsed ? '▶' : '▼'}</span>
          {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
          {keyName !== undefined && <span className="text-gray-400">: </span>}
          {collapsed && (
            <span className="text-gray-400 ml-1">{'{…}'}</span>
          )}
        </span>
        {!collapsed && (
          <div>
            {shownEntries.map(([k, v]) => (
              <JsonTree key={k} data={v} level={level + 1} keyName={k} />
            ))}
            {entries.length > BREADTH_LIMIT && !showAll && (
              <button
                style={{ paddingLeft: (level + 1) * 16 }}
                className="block text-blue-400 hover:text-blue-300 text-xs py-0.5"
                onClick={() => setShowAll(true)}
              >
                … 顯示其餘 {entries.length - BREADTH_LIMIT} 個鍵
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: indent }}>
      {keyName !== undefined && <span className="text-purple-400">{keyName}</span>}
      {keyName !== undefined && <span className="text-gray-400">: </span>}
      <span className="text-gray-300">{String(data)}</span>
    </div>
  )
}

/* ─── Shared Components ─── */
function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-800">
      <button
        className="w-full flex items-center gap-1 px-3 py-2 text-left hover:bg-[#2a2d2e] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-[10px] text-gray-400 w-3">{open ? '▼' : '▶'}</span>
        <span className="font-semibold text-gray-300">{title}</span>
      </button>
      {open && <div className="px-3 pb-2">{children}</div>}
    </div>
  )
}

/* ─── InfoRow, EmptyState and LoadingState ─── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex py-0.5 gap-2 leading-5">
      <span className="text-gray-400 flex-shrink-0">{label}:</span>
      <span className="text-gray-300 break-all min-w-0">{value}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-xs">{message}</div>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-xs gap-2">
      <span className="inline-block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
      {message}
    </div>
  )
}
