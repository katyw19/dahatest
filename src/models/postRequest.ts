export type PostRequestStatus = 'open' | 'borrowed';

export type PostRequest = {
  id: string;
  groupId: string;
  authorUid: string;
  authorDisplayName?: string;
  authorFirstName?: string;
  authorLastName?: string;
  authorGradeTag?: string;
  authorRole?: 'admin' | 'member';
  text: string;
  tags?: string[];
  audienceTag: string;
  category?: string;
  size?: string;
  neededBy?: string;
  photoUrl?: string;
  status: PostRequestStatus;
  borrowedAt?: Date | null;
  acceptedOfferId?: string;
  createdAt: Date | null;
};
