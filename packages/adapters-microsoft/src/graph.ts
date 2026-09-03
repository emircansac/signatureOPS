export type MicrosoftAppCredentials = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

export type GraphPerson = {
  externalId: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  country?: string;
  mobile?: string;
  officePhone?: string;
  photoUrl?: string;
  managerId?: string;
};

export type GraphGroup = {
  externalId: string;
  name: string;
  memberIds: string[];
};

export async function getGraphToken(creds: MicrosoftAppCredentials): Promise<string> {
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Microsoft access token missing");
  return data.access_token;
}

async function graphGet<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph ${res.status} ${url}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

type GraphUserPage = {
  value?: {
    id?: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
    jobTitle?: string;
    department?: string;
    country?: string;
    mobilePhone?: string;
    businessPhones?: string[];
  }[];
  "@odata.nextLink"?: string;
};

type GraphGroupPage = {
  value?: { id?: string; displayName?: string }[];
  "@odata.nextLink"?: string;
};

type GraphMemberPage = {
  value?: { id?: string; "@odata.type"?: string }[];
  "@odata.nextLink"?: string;
};

export async function listGraphUsers(token: string): Promise<GraphPerson[]> {
  const people: GraphPerson[] = [];
  let url: string | undefined =
    "https://graph.microsoft.com/v1.0/users?$select=id,mail,userPrincipalName,displayName,jobTitle,department,country,mobilePhone,businessPhones&$top=999";
  while (url) {
    const page: GraphUserPage = await graphGet<GraphUserPage>(token, url);
    for (const user of page.value ?? []) {
      const email = user.mail || user.userPrincipalName;
      if (!user.id || !email) continue;
      people.push({
        externalId: user.id,
        email,
        displayName: user.displayName || email,
        jobTitle: user.jobTitle || undefined,
        department: user.department || undefined,
        country: user.country || undefined,
        mobile: user.mobilePhone || undefined,
        officePhone: user.businessPhones?.[0],
      });
    }
    url = page["@odata.nextLink"];
  }
  return people;
}

export async function listGraphGroups(token: string): Promise<GraphGroup[]> {
  const groups: GraphGroup[] = [];
  let url: string | undefined =
    "https://graph.microsoft.com/v1.0/groups?$select=id,displayName&$top=999";
  while (url) {
    const page: GraphGroupPage = await graphGet<GraphGroupPage>(token, url);
    for (const group of page.value ?? []) {
      if (!group.id) continue;
      groups.push({
        externalId: group.id,
        name: group.displayName || group.id,
        memberIds: await listGroupMemberIds(token, group.id),
      });
    }
    url = page["@odata.nextLink"];
  }
  return groups;
}

async function listGroupMemberIds(token: string, groupId: string): Promise<string[]> {
  const ids: string[] = [];
  let url: string | undefined =
    `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}/members?$select=id&$top=999`;
  while (url) {
    const page: GraphMemberPage = await graphGet<GraphMemberPage>(token, url);
    for (const member of page.value ?? []) {
      if (member.id && (member["@odata.type"] ?? "").includes("user")) {
        ids.push(member.id);
      } else if (member.id && !member["@odata.type"]) {
        ids.push(member.id);
      }
    }
    url = page["@odata.nextLink"];
  }
  return ids;
}

/**
 * Microsoft Graph has no API to write an Outlook signature.
 * Signatures are applied in the Outlook client via the add-in (setSignatureAsync).
 */
export function microsoftSignatureWriteSupported(): false {
  return false;
}
