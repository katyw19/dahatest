export type MembershipRole = 'member' | 'admin';

export type Membership = {
  groupId: string;
  role: MembershipRole;
  groupName?: string;
  firstName: string;
  lastName: string;
  gradeTag: string;
  joinedAt: Date | null;
  trustScore: number;
  borrowsCompleted: number;
  lendsCompleted: number;
  badges: string[];
  yesCount: number;
  minorCount: number;
  majorCount: number;
  trustScoreIsDefault?: boolean;
  isRemoved?: boolean;
  removedAt?: Date | null;
  removedByUid?: string | null;
  removedByName?: string | null;
  removedReason?: string | null;
  displayName?: string;
  badgesEarned?: string[];
  lastBadgeEarned?: { id: string; earnedAt?: Date | null } | null;
};
