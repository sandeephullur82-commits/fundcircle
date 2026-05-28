import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

interface NetworkStatusBadgeProps {
  className?: string;
}

export default function NetworkStatusBadge({ className = '' }: NetworkStatusBadgeProps) {
  const { isOnline } = useNetworkStatus();

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-300 ${className}`}
      style={{
        background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
        color: isOnline ? '#22c55e' : '#f97316',
        border: `1px solid ${isOnline ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)'}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: isOnline ? '#22c55e' : '#f97316',
          boxShadow: isOnline ? '0 0 4px #22c55e' : '0 0 4px #f97316',
          animation: isOnline ? 'none' : 'pulse 1.5s infinite',
        }}
      />
      {isOnline ? 'Connected' : 'Offline Mode'}
    </div>
  );
}
