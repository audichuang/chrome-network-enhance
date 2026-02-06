export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  time: number;
  size: number;
  mimeType: string;
  requestHeaders: Header[];
  responseHeaders: Header[];
  requestBody: string | null;
  responseBody: string | null;
  startedDateTime: string;
  serverIPAddress?: string;
}

export interface Header {
  name: string;
  value: string;
}

export interface FilterState {
  search: string;
  statusFilter: 'all' | '2xx' | '3xx' | '4xx' | '5xx';
  methodFilter: 'all' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
}
