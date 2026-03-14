export type OfferStatus = 'pending' | 'accepted' | 'rejected';
export type OfferCondition = 'new' | 'good' | 'used';

export type Offer = {
  id: string;
  postId: string;
  groupId: string;
  lenderUid: string;
  lenderFirstName?: string;
  lenderLastName?: string;
  lenderGradeTag?: string;
  lenderTrustScore?: number;
  itemDescription: string;
  condition: OfferCondition;
  photoUrl?: string;
  notes?: string;
  createdAt: Date | null;
  status: OfferStatus;
};
