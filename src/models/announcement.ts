/** Map of emoji → array of UIDs who reacted */
export type AnnouncementReactions = Record<string, string[]>;

export type Announcement = {
  id: string;
  text: string;
  createdAt: Date | null;
  createdByUid: string;
  createdByName?: string;
  pinned: boolean;
  expiresAt?: Date | null;
  reactions?: AnnouncementReactions;
};
