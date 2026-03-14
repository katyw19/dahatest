export const DEFAULT_GRADES = [
  'Anyone',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const getPostAudienceOptions = (groupGradeTags: string[] | undefined) => {
  if (groupGradeTags && groupGradeTags.length > 0) {
    const set = new Set(groupGradeTags);
    set.add('Anyone');
    return Array.from(set);
  }
  return DEFAULT_GRADES;
};
