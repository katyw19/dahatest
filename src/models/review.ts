export type ReviewResult = 'yes' | 'minor' | 'major';

export type TransactionReview = {
  id: string;
  threadId: string;
  groupId: string;
  reviewerUid: string;
  revieweeUid: string;
  result: ReviewResult;
  explanation?: string;
  createdAt: Date | null;
};
