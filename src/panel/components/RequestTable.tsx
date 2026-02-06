import { useState } from 'react'
import { NetworkRequest } from '../../types'
import { formatBytes, formatTime, getStatusColor, getMethodColor, formatJson, extractPath } from '../utils/formatters'

interface RequestTableProps {
  requests: NetworkRequest[]
  selectedIds: Set<string>
  onSelect: (id: string, allIds: string[], event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onSelectAll: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export default function RequestTable({
  requests,
  selectedIds,
  onSelect,
  onSelectAll,
  onContextMenu,
}: RequestTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const allIds = requests.map((r) => r.id)
  const allSelected = requests.length > 0 && selectedIds.size === requests.length

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#252526] border-b border-gray-700">
          <tr>
            <th className="w-8 p-2 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="rounded"
              />
            </th>
            <th className="w-16 p-2 text-left">Method</th>
            <th className="p-2 text-left">URL</th>
            <th className="w-16 p-2 text-left">Status</th>
            <th className="w-20 p-2 text-left">Size</th>
            <th className="w-20 p-2 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              isSelected={selectedIds.has(req.id)}
              isExpanded={expandedId === req.id}
              onSelect={(e) => onSelect(req.id, allIds, e)}
              onToggleExpand={() => setExpandedId(expandedId === req.id ? null : req.id)}
              onContextMenu={onContextMenu}
            />
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div className="flex items-center justify-center h-32 text-gray-500">
          No requests captured. Navigate or trigger API calls to see network activity.
        </div>
      )}
    </div>
  )
}

interface RequestRowProps {
  request: NetworkRequest
  isSelected: boolean
  isExpanded: boolean
  onSelect: (e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void
  onToggleExpand: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

function RequestRow({ request, isSelected, isExpanded, onSelect, onToggleExpand, onContextMenu }: RequestRowProps) {
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'headers'>('response')

  return (
    <>
      <tr
        className={`border-b border-gray-800 cursor-pointer ${
          isSelected ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]'
        }`}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'INPUT') {
            onSelect(e)
          }
        }}
        onDoubleClick={onToggleExpand}
        onContextMenu={onContextMenu}
      >
        <td className="p-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation()
              onSelect({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey })
            }}
            className="rounded"
          />
        </td>
        <td className={`p-2 font-mono ${getMethodColor(request.method)}`}>{request.method}</td>
        <td className="p-2 truncate max-w-md">
          {extractPath(request.url)}
        </td>
        <td className={`p-2 font-mono ${getStatusColor(request.status)}`}>{request.status}</td>
        <td className="p-2 text-gray-400">{formatBytes(request.size)}</td>
        <td className="p-2 text-gray-400">{formatTime(request.time)}</td>
      </tr>
      {isExpanded && (
        <tr className="bg-[#1e1e1e]">
          <td colSpan={6} className="p-0">
            <div className="border-l-2 border-blue-500 ml-4">
              <div className="flex border-b border-gray-700">
                <button
                  className={`px-4 py-2 text-xs ${activeTab === 'response' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('response')}
                >
                  Response
                </button>
                <button
                  className={`px-4 py-2 text-xs ${activeTab === 'request' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('request')}
                >
                  Request Body
                </button>
                <button
                  className={`px-4 py-2 text-xs ${activeTab === 'headers' ? 'bg-[#2a2d2e] text-white' : 'text-gray-400'}`}
                  onClick={() => setActiveTab('headers')}
                >
                  Headers
                </button>
              </div>
              <div className="p-4 max-h-64 overflow-auto">
                {activeTab === 'response' && (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {formatJson(request.responseBody) || 'No response body'}
                  </pre>
                )}
                {activeTab === 'request' && (
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {formatJson(request.requestBody) || 'No request body'}
                  </pre>
                )}
                {activeTab === 'headers' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold mb-2 text-gray-400">Request Headers</h4>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {request.requestHeaders.map((h) => `${h.name}: ${h.value}`).join('\n')}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-2 text-gray-400">Response Headers</h4>
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {request.responseHeaders.map((h) => `${h.name}: ${h.value}`).join('\n')}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
