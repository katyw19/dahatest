import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'daha_thread_read_';

/** Mark a thread as read right now */
export const markThreadRead = async (uid: string, threadId: string) => {
  const key = `${KEY_PREFIX}${uid}_${threadId}`;
  await AsyncStorage.setItem(key, Date.now().toString());
};

/** Get the timestamp when a thread was last read (0 if never) */
export const getLastReadAt = async (uid: string, threadId: string): Promise<number> => {
  const key = `${KEY_PREFIX}${uid}_${threadId}`;
  const val = await AsyncStorage.getItem(key);
  return val ? parseInt(val, 10) : 0;
};

/** Get last-read timestamps for multiple threads at once */
export const getLastReadBatch = async (
  uid: string,
  threadIds: string[]
): Promise<Record<string, number>> => {
  if (!threadIds.length) return {};
  const keys = threadIds.map((id) => `${KEY_PREFIX}${uid}_${id}`);
  const pairs = await AsyncStorage.multiGet(keys);
  const result: Record<string, number> = {};
  pairs.forEach(([key, val]) => {
    const threadId = key.replace(`${KEY_PREFIX}${uid}_`, '');
    result[threadId] = val ? parseInt(val, 10) : 0;
  });
  return result;
};
