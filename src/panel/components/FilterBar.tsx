import { FilterState, ResourceType } from '../../types'

interface FilterBarProps {
  filter: FilterState
  onFilterChange: (filter: FilterState) => void
  onClear: () => void
  isRecording: boolean
  onToggleRecording: () => void
  requestCount: number
  selectedCount: number
}

export default function FilterBar({
  filter,
  onFilterChange,
  onClear,
  isRecording,
  onToggleRecording,
  requestCount,
  selectedCount,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-700 bg-[#252526]">
      <button
        onClick={onToggleRecording}
        className={`w-6 h-6 rounded-full flex items-center justify-center ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-500'
        }`}
        title={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording ? (
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        ) : (
          <span className="w-2 h-2 bg-white rounded-full" />
        )}
      </button>

      <button
        onClick={onClear}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
        title="Clear all requests"
      >
        Clear
      </button>

      <div className="w-px h-4 bg-gray-600" />

      <select
        value={filter.resourceType}
        onChange={(e) => onFilterChange({ ...filter, resourceType: e.target.value as ResourceType })}
        className="px-2 py-1 text-xs bg-[#3c3c3c] border border-gray-600 rounded focus:outline-none"
      >
        <option value="fetch">Fetch/XHR</option>
        <option value="all">All</option>
        <option value="document">Doc</option>
        <option value="script">JS</option>
        <option value="stylesheet">CSS</option>
        <option value="image">Img</option>
      </select>

      <input
        type="text"
        placeholder="Filter URL..."
        value={filter.search}
        onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
        className="flex-1 px-2 py-1 text-xs bg-[#3c3c3c] border border-gray-600 rounded focus:outline-none focus:border-blue-500"
      />

      <select
        value={filter.statusFilter}
        onChange={(e) => onFilterChange({ ...filter, statusFilter: e.target.value as FilterState['statusFilter'] })}
        className="px-2 py-1 text-xs bg-[#3c3c3c] border border-gray-600 rounded focus:outline-none"
      >
        <option value="all">All Status</option>
        <option value="2xx">2xx</option>
        <option value="3xx">3xx</option>
        <option value="4xx">4xx</option>
        <option value="5xx">5xx</option>
      </select>

      <select
        value={filter.methodFilter}
        onChange={(e) => onFilterChange({ ...filter, methodFilter: e.target.value as FilterState['methodFilter'] })}
        className="px-2 py-1 text-xs bg-[#3c3c3c] border border-gray-600 rounded focus:outline-none"
      >
        <option value="all">All Methods</option>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
        <option value="PATCH">PATCH</option>
      </select>

      <div className="text-xs text-gray-400">
        {requestCount} requests
        {selectedCount > 0 && <span className="ml-2 text-blue-400">({selectedCount} selected)</span>}
      </div>
    </div>
  )
}
