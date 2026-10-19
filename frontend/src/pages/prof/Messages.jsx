import Messagerie, { MessagerieDevTools, useConversations } from '@/components/Messagerie.jsx';

export default function Messages() {
  const chat = useConversations();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Messagerie chat={chat} />
      <MessagerieDevTools chat={chat} />
    </div>
  );
}
