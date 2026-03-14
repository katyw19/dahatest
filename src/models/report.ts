export type ReportStatus = 'open' | 'in_review' | 'resolved';
export type ReportReason = 'damage' | 'non_return' | 'inappropriate' | 'scam' | 'other';
export type ReportType = 'post' | 'user' | 'thread' | 'review';

export type Report = {
  id: string;
  createdAt: Date | null;
  createdByUid: string;
  createdByName?: string;
  type: ReportType;
  reason: ReportReason;
  detailsText?: string;
  status: ReportStatus;
  assignedToUid?: string | null;
  assignedToName?: string | null;
  resolutionAction?: 'no_action' | 'warned' | 'removed' | 'other' | null;
  resolutionNote?: string | null;
  resolvedAt?: Date | null;
  resolvedByUid?: string | null;
  resolvedByName?: string | null;
  lastUpdatedAt?: Date | null;
  target?: {
    targetUid?: string;
    targetName?: string;
    postId?: string;
    threadId?: string;
    reviewId?: string;
  };
  evidence?: {
    lastMessageSnippet?: string;
    postTextSnippet?: string;
  };
  admin?: {
    assignedAdminUid?: string;
    resolvedAt?: Date | null;
    resolvedByUid?: string;
    resolutionNote?: string;
  };
};
