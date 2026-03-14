export type BadgeDefinition = {
  id: string;
  threshold: number;
  title: string;
  description: string;
  icon: string;
  color: string;
};

// Lending ladder badges (ordered)
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'sharing_starter',
    threshold: 1,
    title: 'Sharing Starter',
    description: 'Complete your first lend to earn this starter badge.',
    icon: 'hand-heart',
    color: '#4ade80',
  },
  {
    id: 'community_helper',
    threshold: 5,
    title: 'Community Helper',
    description: 'Help out five times to become a trusted helper.',
    icon: 'account-group',
    color: '#60a5fa',
  },
  {
    id: 'the_giver',
    threshold: 10,
    title: 'The Giver',
    description: 'Ten lends completed—keep it going!',
    icon: 'gift',
    color: '#4B7BFF',
  },
  {
    id: 'lend_legend',
    threshold: 15,
    title: 'Lend Legend',
    description: 'Fifteen lends completed—legend status unlocked.',
    icon: 'trophy-award',
    color: '#fbbf24',
  },
  {
    id: 'mvg',
    threshold: 20,
    title: 'MVG (Most Valuable Giver)',
    description: 'Twenty lends completed. Thank you for powering the community.',
    icon: 'crown',
    color: '#f97316',
  },
];
