"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Badge, Card } from "@/components/ui";

function missingFields(user: {
  displayName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  mobile: string | null;
}) {
  const missing: string[] = [];
  if (!user.jobTitle) missing.push("jobTitle");
  if (!user.department) missing.push("department");
  if (!user.mobile) missing.push("mobile");
  return missing;
}

export default function DirectoryPage() {
  const t = useTranslations("directory");
  const { data: users, isLoading } = trpc.users.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-zinc-500">{t("subtitle")}</p>
        </div>
        <span title={t("syncDisabled")}>
          <Badge>Sync — Yakında</Badge>
        </span>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("email")}</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">{t("department")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("country")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("missingFields")}</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => {
              const missing = missingFields(user);
              return (
                <tr key={user.id} className="border-b border-zinc-100">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3 font-medium">{user.displayName}</td>
                  <td className="px-4 py-3">{user.department ?? "—"}</td>
                  <td className="px-4 py-3">{user.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    {missing.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {missing.map((f) => (
                          <Badge key={f} variant="warning">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
