export type PostType = 'daha' | 'dawa';
export type PostRequestStatus = 'open' | 'borrowed' | 'claimed';

export type PostRequest = {
  id: string;
  groupId: string;
  authorUid: string;
  authorDisplayName?: string;
  authorFirstName?: string;
  authorLastName?: string;
  authorGradeTag?: string;
  authorRole?: 'admin' | 'member';
  type?: PostType;
  text: string;
  tags?: string[];
  audienceTag: string;
  category?: string;
  size?: string;
  neededBy?: string;
  condition?: 'new' | 'good' | 'used';
  photoUrl?: string;
  status: PostRequestStatus;
  borrowedAt?: Date | null;
  acceptedOfferId?: string;
  createdAt: Date | null;
};
