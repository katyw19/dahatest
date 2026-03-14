export type Announcement = {
  id: string;
  text: string;
  createdAt: Date | null;
  createdByUid: string;
  createdByName?: string;
  pinned: boolean;
  expiresAt?: Date | null;
};
