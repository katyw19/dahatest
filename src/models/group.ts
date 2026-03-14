export type Group = {
  id: string;
  name: string;
  description?: string;
  rules?: string;
  gradeTags: string[];
  createdAt: Date | null;
  createdByUid: string;
  inviteCode: string;
  isPrivate: boolean;
};
