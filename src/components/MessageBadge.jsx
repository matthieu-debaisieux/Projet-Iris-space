import { useMessageCount } from '../lib/messageCount.jsx';

// Pastille rouge du nombre de messages non lus
export default function MessageBadge({ className = 'right-3' }) {
  const { count } = useMessageCount();
  if (count <= 0) return null;

  return (
    <span className={`flex absolute -top-1 ${className} min-w-[20px] h-5 bg-red-600 text-white text-xs font-bold rounded-full items-center justify-center px-1 leading-none pointer-events-none`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
