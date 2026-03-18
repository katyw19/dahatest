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
    description: 'Complete your first lend to earn this starter badge. Everyone starts somewhere!',
    icon: 'hand-heart',
    color: '#4ade80',
  },
  {
    id: 'good_neighbor',
    threshold: 3,
    title: 'Good Neighbor',
    description: 'Three lends done — you\'re becoming someone people can count on.',
    icon: 'home-heart',
    color: '#38bdf8',
  },
  {
    id: 'community_helper',
    threshold: 5,
    title: 'Community Helper',
    description: 'Help out five times to become a trusted helper in your group.',
    icon: 'account-group',
    color: '#60a5fa',
  },
  {
    id: 'rising_star',
    threshold: 8,
    title: 'Rising Star',
    description: 'Eight lends and counting — you\'re on the rise!',
    icon: 'star-shooting',
    color: '#a78bfa',
  },
  {
    id: 'the_giver',
    threshold: 10,
    title: 'The Giver',
    description: 'Ten lends completed — you\'re making a real difference. Keep it going!',
    icon: 'gift',
    color: '#4B7BFF',
  },
  {
    id: 'lend_legend',
    threshold: 15,
    title: 'Lend Legend',
    description: 'Fifteen lends completed — legend status unlocked. People look up to you.',
    icon: 'trophy-award',
    color: '#fbbf24',
  },
  {
    id: 'mvg',
    threshold: 20,
    title: 'MVG (Most Valuable Giver)',
    description: 'Twenty lends completed. Thank you for powering the community!',
    icon: 'crown',
    color: '#f97316',
  },
  {
    id: 'super_sharer',
    threshold: 30,
    title: 'Super Sharer',
    description: 'Thirty lends! You\'re in the top tier of community generosity.',
    icon: 'rocket-launch',
    color: '#ec4899',
  },
  {
    id: 'heart_of_gold',
    threshold: 50,
    title: 'Heart of Gold',
    description: 'Fifty lends — your generosity is truly legendary. Gold-tier status achieved.',
    icon: 'heart-multiple',
    color: '#ef4444',
  },
  {
    id: 'ultimate_giver',
    threshold: 100,
    title: 'Ultimate Giver',
    description: 'One hundred lends. You are the backbone of this community. Respect.',
    icon: 'diamond-stone',
    color: '#14b8a6',
  },
];
