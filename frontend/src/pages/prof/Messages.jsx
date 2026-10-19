import ProfLayout from '../../layouts/ProfLayout.jsx';
import DevPanel from '../../components/DevPanel.jsx';
import Messagerie, { MessagerieDevTools, useConversations } from '../../components/Messagerie.jsx';

export default function Messages() {
  const chat = useConversations();

  return (
    <ProfLayout>
      <div className="flex flex-1 overflow-hidden">
        <Messagerie chat={chat} />
      </div>
      <DevPanel>
        <MessagerieDevTools chat={chat} />
      </DevPanel>
    </ProfLayout>
  );
}
