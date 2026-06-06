import { useRef, useEffect, useState } from 'react'
import { NetworkRequest } from '../../types'
import { formatJson } from '../utils/formatters'
import {
  generateCurl,
  generatePostmanCollection,
  generateMockoonEnvironment,
  generateMarkdownTable,
  generateApiMockExport,
  formatHeaders,
  formatResponsesAsJson,
  copyToClipboard,
} from '../utils/copyUtils'

interface ContextMenuProps {
  x: number
  y: number
  selectedRequests: NetworkRequest[]
  fetchResponseBody: (id: string) => Promise<string | null>
  onClose: () => void
  onToast: (message: string, type?: 'success' | 'error') => void
  onClearSelection: () => void
}

export default function ContextMenu({
  x,
  y,
  selectedRequests,
  fetchResponseBody,
  onClose,
  onToast,
  onClearSelection,
}: ContextMenuProps) {
  const count = selectedRequests.length
  const single = count === 1
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y })

  // render 後測量選單尺寸，超出 viewport 則校正位置
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = x
    let top = y
    if (top + rect.height > vh) {
      top = Math.max(0, y - rect.height)
    }
    if (left + rect.width > vw) {
      left = Math.max(0, vw - rect.width - 4)
    }
    setAdjustedPos({ left, top })
  }, [x, y])

  // 獲取含有完整 response body 的 NetworkRequest 列表
  const getRequestsWithBodies = async (reqs: NetworkRequest[]): Promise<NetworkRequest[]> => {
    return Promise.all(
      reqs.map(async (req) => {
        if (req.responseBody !== null) {
          return req
        }
        const body = await fetchResponseBody(req.id)
        return { ...req, responseBody: body }
      })
    )
  }

  const handleAction = async (
    action: (reqs: NetworkRequest[]) => string | Promise<string>,
    successMessage: string,
    requiresBody?: boolean
  ) => {
    try {
      const filledRequests = requiresBody
        ? await getRequestsWithBodies(selectedRequests)
        : selectedRequests
      const text = await action(filledRequests)
      await copyToClipboard(text)
      onToast(successMessage, 'success')
    } catch (err) {
      console.error('Copy failed:', err)
      onToast('Copy failed — check clipboard permission', 'error')
    }
    onClose()
  }

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjustedPos.left,
    top: adjustedPos.top,
    zIndex: 1000,
  }

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-[#2d2d2d] border border-gray-600 rounded shadow-lg py-1 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
    >
      {single && (
        <>
          <MenuItem
            label="Copy as cURL"
            onClick={() => handleAction(async (reqs) => generateCurl(reqs[0]), 'cURL copied!')}
          />
          <MenuItem
            label="Copy Response"
            onClick={() => handleAction(async (reqs) => formatJson(reqs[0].responseBody || ''), 'Response copied!', true)}
          />
          <MenuItem
            label="Copy Request Body"
            onClick={() => handleAction(async (reqs) => formatJson(reqs[0].requestBody || ''), 'Request body copied!')}
          />
          <MenuItem
            label="Copy Headers"
            onClick={() =>
              handleAction(
                async (reqs) => formatHeaders(reqs[0].requestHeaders) + '\n\n' + formatHeaders(reqs[0].responseHeaders),
                'Headers copied!'
              )
            }
          />
          <Divider />
        </>
      )}

      {count >= 1 && (
        <>
          <MenuItem
            label={`Export to Postman${count > 1 ? ` (${count})` : ''}`}
            onClick={() =>
              handleAction(async (reqs) => generatePostmanCollection(reqs), 'Postman collection copied!')
            }
          />
          <MenuItem
            label={`Export to Mockoon${count > 1 ? ` (${count})` : ''}`}
            onClick={() =>
              handleAction(async (reqs) => generateMockoonEnvironment(reqs), 'Mockoon environment copied!', true)
            }
          />
          <MenuItem
            label={`Copy for API Mock${count > 1 ? ` (${count})` : ''}`}
            onClick={() =>
              handleAction(async (reqs) => generateApiMockExport(reqs), 'API Mock JSON copied!', true)
            }
          />
          <MenuItem
            label={`Copy as Markdown Table${count > 1 ? ` (${count})` : ''}`}
            onClick={() => handleAction(async (reqs) => generateMarkdownTable(reqs), 'Markdown copied!', true)}
          />
          {count > 1 && (
            <MenuItem
              label={`Copy All Responses (${count})`}
              onClick={() =>
                handleAction(async (reqs) => formatResponsesAsJson(reqs), `${count} responses copied!`, true)
              }
            />
          )}
          <Divider />
        </>
      )}

      <MenuItem
        label="Clear Selection"
        onClick={() => {
          onClearSelection()
          onClose()
        }}
      />
    </div>
  )
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full px-4 py-1.5 text-left text-xs hover:bg-[#094771] text-gray-200"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function Divider() {
  return <div className="my-1 border-t border-gray-600" />
}
