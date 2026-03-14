export type JoinRequestStatus = 'pending' | 'approved' | 'denied';

export type JoinRequest = {
  id: string;
  groupId: string;
  requesterUid: string;
  firstName: string;
  lastName: string;
  gradeTag: string;
  createdAt: Date | null;
  status: JoinRequestStatus;
  reviewedByUid?: string;
};
