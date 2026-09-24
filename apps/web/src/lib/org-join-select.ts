export type JoinOrgRecord = {
  id: string;
  name: string;
  slug: string;
  joinDomain: string | null;
};

export function pickOrgForJoinDomain(domain: string, orgs: JoinOrgRecord[]): JoinOrgRecord | null {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) return null;
  const matches = orgs.filter((org) => org.joinDomain?.toLowerCase() === normalized);
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
