import type { ChatStatus } from '../types/chat'

interface StatusBadgeProps {
  status: ChatStatus
}

const LABELS: Record<ChatStatus, string> = {
  connecting: 'Connecting',
  searching: 'Searching',
  connected: 'Connected',
  disconnected: 'Disconnected',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-status={status}>
      {LABELS[status]}
    </span>
  )
}
