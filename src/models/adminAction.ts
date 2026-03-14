export type AdminActionType = 'warn' | 'remove' | 'message' | 'other';

export type AdminAction = {
  id: string;
  type: AdminActionType;
  targetUid: string;
  targetName?: string;
  createdAt: Date | null;
  createdByUid: string;
  createdByName?: string;
  reportId?: string;
  note?: string;
};
