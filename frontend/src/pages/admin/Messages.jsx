import AdminLayout from '../../layouts/AdminLayout.jsx';
import Messagerie, { MessagerieDevTools, useConversations } from '../../components/Messagerie.jsx';

export default function Messages() {
  const chat = useConversations();

  return (
    <AdminLayout devTools={<MessagerieDevTools chat={chat} />}>
      <Messagerie chat={chat} />
    </AdminLayout>
  );
}
