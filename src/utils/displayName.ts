export const resolveDisplayName = (opts: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fallbackUid?: string | null;
}) => {
  const display = opts.displayName?.trim();
  if (display) return display;
  const full = `${opts.firstName ?? ''} ${opts.lastName ?? ''}`.trim();
  if (full) return full;
  if (opts.fallbackUid) return `${opts.fallbackUid.slice(0, 6)}…`;
  return 'Unknown member';
};
