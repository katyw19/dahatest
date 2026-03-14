export type ChatThread = {
  id: string;
  groupId: string;
  postId: string;
  offerId: string;
  borrowerUid: string;
  lenderUid: string;
  borrowerFirstName?: string;
  borrowerLastName?: string;
  lenderFirstName?: string;
  lenderLastName?: string;
  isOpen: boolean;
  createdAt: Date | null;
  closedAt?: Date | null;
};

export type Message = {
  id: string;
  threadId: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
};
