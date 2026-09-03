import type { JWT } from "google-auth-library";
import { googleAccessToken } from "./auth.js";
import type { DirectoryGroup, DirectoryPerson } from "./types.js";

async function googleGet<T>(auth: JWT, url: string): Promise<T> {
  const token = await googleAccessToken(auth);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google API ${res.status} ${url}: ${body.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

type GoogleUser = {
  id?: string;
  primaryEmail?: string;
  aliases?: string[];
  name?: { fullName?: string };
  organizations?: { title?: string; department?: string; primary?: boolean }[];
  phones?: { value?: string; type?: string }[];
  thumbnailPhotoUrl?: string;
  recoveryEmail?: string;
  addresses?: { country?: string; countryCode?: string }[];
};

type GoogleGroup = { id?: string; email?: string; name?: string };
type GoogleMember = { email?: string; type?: string };

function pickTitle(user: GoogleUser): string | undefined {
  const primary = user.organizations?.find((org) => org.primary) ?? user.organizations?.[0];
  return primary?.title || undefined;
}

function pickDepartment(user: GoogleUser): string | undefined {
  const primary = user.organizations?.find((org) => org.primary) ?? user.organizations?.[0];
  return primary?.department || undefined;
}

function pickPhone(user: GoogleUser, type: string): string | undefined {
  return user.phones?.find((phone) => phone.type === type)?.value ?? undefined;
}

export async function listWorkspaceUsers(
  auth: JWT,
  customerId = "my_customer",
): Promise<DirectoryPerson[]> {
  const people: DirectoryPerson[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      customer: customerId,
      maxResults: "500",
      projection: "full",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleGet<{ users?: GoogleUser[]; nextPageToken?: string }>(
      auth,
      `https://admin.googleapis.com/admin/directory/v1/users?${params.toString()}`,
    );
    for (const user of data.users ?? []) {
      if (!user.id || !user.primaryEmail) continue;
      const aliases = [user.primaryEmail, ...(user.aliases ?? [])];
      people.push({
        externalId: user.id,
        email: user.primaryEmail,
        displayName: user.name?.fullName || user.primaryEmail,
        jobTitle: pickTitle(user),
        department: pickDepartment(user),
        country: user.addresses?.find((a) => a.countryCode || a.country)?.countryCode,
        mobile: pickPhone(user, "mobile"),
        officePhone: pickPhone(user, "work"),
        photoUrl: user.thumbnailPhotoUrl,
        aliases: [...new Set(aliases)],
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return people;
}

export async function listWorkspaceGroups(
  auth: JWT,
  customerId = "my_customer",
): Promise<DirectoryGroup[]> {
  const groups: DirectoryGroup[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ customer: customerId, maxResults: "200" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleGet<{ groups?: GoogleGroup[]; nextPageToken?: string }>(
      auth,
      `https://admin.googleapis.com/admin/directory/v1/groups?${params.toString()}`,
    );
    for (const group of data.groups ?? []) {
      const key = group.id || group.email;
      if (!key) continue;
      const members = await listGroupMembers(auth, key);
      groups.push({
        externalId: group.id || group.email || key,
        name: group.name || group.email || key,
        memberEmails: members,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return groups;
}

async function listGroupMembers(auth: JWT, groupKey: string): Promise<string[]> {
  const emails: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ maxResults: "200" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleGet<{ members?: GoogleMember[]; nextPageToken?: string }>(
      auth,
      `https://admin.googleapis.com/admin/directory/v1/groups/${encodeURIComponent(groupKey)}/members?${params.toString()}`,
    );
    for (const member of data.members ?? []) {
      if (member.type === "USER" && member.email) emails.push(member.email.toLowerCase());
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return emails;
}
