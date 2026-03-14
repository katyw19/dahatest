import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGroupContext } from '../screens/groups/GroupProvider';
import { listenOpenThreadsForUser } from '../services/threads';

export const useOpenThreadCount = () => {
  const { user } = useAuth();
  const { currentGroup } = useGroupContext();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || !currentGroup) {
      setCount(0);
      return;
    }
    const unsub = listenOpenThreadsForUser(currentGroup.id, user.uid, (threads) => {
      setCount(threads.length);
    });
    return () => unsub();
  }, [user?.uid, currentGroup?.id]);

  return count;
};
