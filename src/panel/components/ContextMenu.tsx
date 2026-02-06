import { NetworkRequest } from '../../types'
import {
  generateCurl,
  generatePostmanCollection,
  generateMarkdownTable,
  formatHeaders,
  formatResponsesAsJson,
  copyToClipboard,
} from '../utils/copyUtils'

interface ContextMenuProps {
  x: number
  y: number
  selectedRequests: NetworkRequest[]
  onClose: () => void
  onCopySuccess: (message: string) => void
  onClearSelection: () => void
}

export default function ContextMenu({
  x,
  y,
  selectedRequests,
  onClose,
  onCopySuccess,
  onClearSelection,
}: ContextMenuProps) {
  const count = selectedRequests.length
  const single = count === 1
  const request = selectedRequests[0]

  const handleAction = async (action: () => Promise<string>, successMessage: string) => {
    try {
      const text = await action()
      await copyToClipboard(text)
      onCopySuccess(successMessage)
    } catch (err) {
      console.error('Copy failed:', err)
    }
    onClose()
  }

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 1000,
  }

  return (
    <div
      style={menuStyle}
      className="bg-[#2d2d2d] border border-gray-600 rounded shadow-lg py-1 min-w-[200px]"
      onClick={(e) => e.stopPropagation()}
    >
      {single && (
        <>
          <MenuItem
            label="Copy as cURL"
            onClick={() => handleAction(async () => generateCurl(request), 'cURL copied!')}
          />
          <MenuItem
            label="Copy Response"
            onClick={() => handleAction(async () => request.responseBody || '', 'Response copied!')}
          />
          <MenuItem
            label="Copy Request Body"
            onClick={() => handleAction(async () => request.requestBody || '', 'Request body copied!')}
          />
          <MenuItem
            label="Copy Headers"
            onClick={() =>
              handleAction(
                async () => formatHeaders(request.requestHeaders) + '\n\n' + formatHeaders(request.responseHeaders),
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
              handleAction(async () => generatePostmanCollection(selectedRequests), 'Postman collection copied!')
            }
          />
          <MenuItem
            label={`Copy as Markdown Table${count > 1 ? ` (${count})` : ''}`}
            onClick={() => handleAction(async () => generateMarkdownTable(selectedRequests), 'Markdown copied!')}
          />
          {count > 1 && (
            <MenuItem
              label={`Copy All Responses (${count})`}
              onClick={() =>
                handleAction(async () => formatResponsesAsJson(selectedRequests), `${count} responses copied!`)
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
