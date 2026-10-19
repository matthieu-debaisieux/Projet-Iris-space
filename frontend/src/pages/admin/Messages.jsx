import Messagerie, { MessagerieDevTools, useConversations } from '@/components/Messagerie.jsx';

export default function Messages() {
  const chat = useConversations();

  return (
    <>
      <Messagerie chat={chat} />
      <MessagerieDevTools chat={chat} />
    </>
  );
}
