import type { DocumentSnapshot } from "firebase/firestore";

/**
 * Safely merges Firestore doc data + forces id from snap.id.
 * Prevents "id specified more than once" warnings.
 */
export const withId = <T extends Record<string, any>>(snap: DocumentSnapshot): T => {
  const data = (snap.data() ?? {}) as Record<string, any>;
  // Remove any existing "id" field coming from Firestore data (if present)
  const { id: _ignored, ...rest } = data;
  return { ...(rest as T), id: snap.id } as T;
};

