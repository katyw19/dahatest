import type { Timestamp } from 'firebase/firestore';

export type UserGrade = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  pronouns?: string;
  photoURL?: string;

  firstName: string;
  lastName: string;

  // Optional until profile setup is complete
  grade: UserGrade | null;
  gradeTag?: string;

  // Activity stats
  totalLends: number;
  totalBorrows: number;
  badgesEarned?: Record<string, boolean>;
  lastBadgeEarned?: {
    id: string;
    earnedAt?: Timestamp;
  } | null;

  // Trust system
  trustScore: number; // 0–100
  trustScoreIsDefault: boolean;

  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
