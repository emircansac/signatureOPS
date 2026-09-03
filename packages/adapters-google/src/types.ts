export const GOOGLE_DWD_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
  "https://www.googleapis.com/auth/gmail.settings.basic",
] as const;

export type GoogleServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

export type DirectoryPerson = {
  externalId: string;
  email: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  country?: string;
  mobile?: string;
  officePhone?: string;
  photoUrl?: string;
  aliases: string[];
};

export type DirectoryGroup = {
  externalId: string;
  name: string;
  memberEmails: string[];
};

export type SendAsSignature = {
  sendAsEmail: string;
  signature: string;
  isPrimary: boolean;
};

export type HtmlDiff = {
  changed: boolean;
  submittedBytes: number;
  storedBytes: number;
  tagsRemoved: string[];
  stylesAltered: boolean;
  summary: string;
};
