# SignatureOps — Production Build Plan & MVP

> A privacy-first platform for centrally creating, governing, and deploying compliant email
> signatures across Google Workspace and Microsoft 365 — without routing corporate email
> through a third party.

This document is the **single source of truth** for building the MVP. It is written to be read by
an AI coding agent (Cursor) as persistent context. Keep it at `/docs/build-plan.md` and reference
it in prompts. Companion file: `.cursorrules` (agent guardrails).

---

## 0. Non-negotiable architectural facts (verified)

These constrain everything. Do not "fix" them.

1. **Google Workspace has a real signature write API.** Gmail `users.settings.sendAs.update`
   sets a signature per sending alias. Gmail **sanitizes** submitted HTML on save, so you must
   read the result back and diff it against what you sent.
2. **Microsoft Graph has NO signature write API.** Signatures live in the Outlook client, not the
   mailbox. The only supported path is an **Outlook add-in** using **event-based activation** +
   `Office.context.mailbox.item.body.setSignatureAsync`.
3. **The add-in path does not guarantee coverage.** It applies at compose time, the user can delete
   it, it requires admin deployment + an internet connection at launch, it times out (~300s), it
   does not fire when editing an existing draft, and account-switch refresh (`OnMessageFromChanged`)
   needs Mailbox requirement set **1.13** vs **1.10** for basic `setSignatureAsync`.
4. **Mac and mobile need a second manifest.** The unified manifest is not supported on Outlook for
   Mac or mobile; those require an add-in-only manifest. Treat Mac/mobile as a later, narrower slice.
5. **Positioning honesty rule:** Google signatures are *stored*; Microsoft signatures are *applied
   in the client at compose time*. Never market add-in-based disclaimers as guaranteed on 100% of
   outbound mail. Server-side transport stamping (the only 100% guarantee) is explicitly a
   **post-MVP Compliance tier**, not part of this build.

---

## 1. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript everywhere | One language across pure packages, API, UI, add-in |
| Monorepo | Turborepo + pnpm workspaces | Clean package boundaries; the pure core is reusable |
| Admin UI + API | Next.js (App Router) | Single deployable for control plane + admin console |
| API layer | tRPC | End-to-end typesafety between UI and server |
| DB | PostgreSQL + Prisma | Relational fits org/dir/rule model; Prisma is Cursor-friendly |
| Jobs / retries | BullMQ + Redis | Deployment adapters need queues, retries, backoff |
| Auth (admins) | Auth.js (NextAuth) | Google + Microsoft OIDC sign-in for admins |
| Directory/deploy OAuth | google-auth-library, @azure/msal-node, @microsoft/microsoft-graph-client | Directory sync + Gmail deploy |
| Outlook add-in | Office.js, Vite | Event-based activation + setSignatureAsync |
| Validation | Zod | Template schema + rule schema validated at every boundary |
| Testing | Vitest (unit), Playwright (UI e2e) | Pure core is unit-tested exhaustively |
| Hosting (MVP) | Vercel (web) + Fly.io/Railway (worker + Redis + Postgres) | Simple, cheap, scales later |

---

## 2. Monorepo layout

```
signatureops/
├─ apps/
│  ├─ web/                 # Next.js admin console + tRPC API (control plane)
│  ├─ worker/              # BullMQ consumers: dir sync, gmail deploy, read-back diff
│  └─ outlook-addin/       # Office.js event-based add-in (Vite)
├─ packages/
│  ├─ schema/              # Canonical template JSON schema + zod types  [BUILD FIRST]
│  ├─ compiler/            # template JSON -> email-safe HTML + plain text
│  ├─ linter/              # deterministic compatibility linter + Quality Score
│  ├─ rules/               # rule engine + simulator (pure, explainable)
│  ├─ db/                  # Prisma schema + client
│  ├─ adapters-google/     # directory sync + Gmail sendAs deploy + read-back diff
│  └─ adapters-microsoft/  # Graph directory sync + add-in signature bundle service
├─ docs/
│  └─ build-plan.md        # THIS FILE
├─ .cursorrules
├─ turbo.json
└─ pnpm-workspace.yaml
```

**Dependency direction:** `schema` <- `compiler` <- `linter`; `schema` <- `rules`. Adapters and
apps depend on the pure packages, never the reverse. The four pure packages (`schema`, `compiler`,
`linter`, `rules`) must have **zero** dependency on `db`, network, or framework code.

---

## 3. Data model (Prisma sketch)

```prisma
model Organization { id String @id @default(cuid()); name String; createdAt DateTime @default(now())
  users User[]; groups Group[]; templates Template[]; rules Rule[]; campaigns Campaign[]
  brandAssets BrandAsset[]; provider Provider }   // provider: GOOGLE | MICROSOFT | BOTH

model User { id String @id @default(cuid()); orgId String; org Organization @relation(...)
  externalId String                     // Google id / Entra objectId
  displayName String; jobTitle String?; department String?; country String?
  email String; mobile String?; officePhone String?; photoUrl String?; managerId String?
  attributes Json                       // custom + raw directory attrs
  sendAsAliases String[]                // Gmail aliases
  @@unique([orgId, externalId]) }

model Group { id String @id; orgId String; externalId String; name String; memberIds String[] }

model Template { id String @id; orgId String; name String
  definition Json                       // canonical template JSON (source of truth)
  compatibility Json                    // declared: outlookSafe, darkMode, mobileWidth, ...
  version Int @default(1) }

model Rule { id String @id; orgId String; name String; level RuleLevel   // USER|GROUP|DEPT_OFFICE|ORG
  priority Int; conditions Json; actions Json; enabled Boolean @default(true) }

model Campaign { id String @id; orgId String; name String; bannerAssetId String
  startDate DateTime; endDate DateTime; targeting Json }

model BrandAsset { id String @id; orgId String; kind AssetKind; url String; bytes Int; width Int?; height Int? }

model Deployment { id String @id; orgId String; userId String; provider Provider
  status DeployStatus; compiledHtmlHash String; sanitizedDiff Json?
  error Json?; attempt Int @default(0); updatedAt DateTime @updatedAt }

model AuditEvent { id String @id; orgId String; actor String; action String; payload Json; at DateTime @default(now()) }
```

Two roles only: `SUPER_ADMIN`, `CONTENT_MANAGER`. No SCIM, no custom role builder in MVP.

---

## 4. The canonical template schema (contract for `packages/schema`)

The JSON is the source of truth; HTML is generated output. Zod-validate on write.

```ts
type TemplateDefinition = {
  layout: "single-column" | "two-column";
  blocks: Block[];
};
type Block =
  | { type: "identity";        fields: string[]; visibleWhen?: string }
  | { type: "contact_details"; fields: string[]; visibleWhen?: string }
  | { type: "company_logo";    assetId: string;  visibleWhen?: string }
  | { type: "profile_photo";   visibleWhen?: string }
  | { type: "social_links";    links: {network:string; url:string}[] }
  | { type: "cta_button";      label: string; url: string }
  | { type: "campaign_banner"; campaignId: string }
  | { type: "legal_disclaimer"; text: string; visibleWhen?: string }
  | { type: "certifications";  items: string[] }
  | { type: "custom_text";     text: string; visibleWhen?: string }
  | { type: "spacer" } | { type: "divider" };
```

Placeholders resolved by the compiler: `{{user.displayName}}`, `{{user.jobTitle}}`,
`{{user.department}}`, `{{user.email}}`, `{{user.mobile}}`, `{{organization.name}}`,
`{{office.address}}`, `{{manager.displayName}}`. Support required/optional, default values,
fallbacks, formatting functions (phone, url-validate), and `visibleWhen` conditional visibility.

---

## 5. Build phases (each phase = a Cursor working session with a demo at the end)

### Phase 0 — Scaffold (½ day)
- Turborepo + pnpm workspaces, TS strict, Vitest, ESLint/Prettier, empty package skeletons.
- **Done when:** `pnpm test` and `pnpm build` run green across empty packages.

### Phase 1 — `packages/schema` (TDD, no I/O)
- Zod schema + TS types for `TemplateDefinition`, `Rule.conditions`, `Rule.actions`.
- Placeholder token grammar + a resolver interface (takes a `UserContext`, returns string).
- **Done when:** invalid templates/rules are rejected with typed errors; 100% of block variants
  have round-trip parse tests.

### Phase 2 — `packages/compiler` (TDD, no I/O) ← highest-value core
- `compile(definition, userContext, assets) -> { html, plainText, sizeBytes }`.
- Table-based, fully inline-styled output. Escape all directory values. Enforce image dimensions,
  add `alt` text, strip unsupported CSS. Produce Gmail and Outlook variants where needed.
- **Done when:** golden-file snapshot tests for all ~15 templates; output contains no flexbox/grid/
  external stylesheet; deterministic (same input → byte-identical output).

### Phase 3 — `packages/linter` + Quality Score (TDD, no I/O)
- Deterministic rules only (no screenshots). Flag: flexbox, grid, JS, forms, video, external
  stylesheets, background-image dependence, SVG risk, oversized base64, HTTP (non-HTTPS) resources,
  missing dimensions, excessive width, deep nesting, empty links, missing alt, invalid tel/mailto.
- Quality Score with **rule-checkable** rubric per category (see weights below).
- **Done when:** each lint rule has a passing + failing fixture; score is reproducible; every
  deduction maps to a concrete "+N points if you…" remediation string.

Quality Score weights: Rendering safety 30 · Brand compliance 20 · Accessibility 15 ·
Data completeness 15 · Performance/size 10 · Deployment readiness 10.
Brand compliance must be checkable: approved logo assetId used, palette within allowed set,
required disclaimer present for the org/country.

### Phase 4 — `packages/rules` engine + simulator (TDD, no I/O) ← key differentiator
- Conditions (MVP): user/group, department, office, country, company/brand, job title, sending
  alias, new-vs-reply, internal-vs-external recipient, campaign date range.
- Actions (MVP): choose template, choose disclaimer, choose banner, hide/show component, override
  brand asset.
- Precedence: User → Group → Dept/Office → Org default; manual ordering within a level; **no
  implicit conflict resolution** — every decision emits an explanation trace.
- `simulate(input) -> { selectedTemplate, selectedBanner, selectedDisclaimer, rulesEvaluated,
  rulesMatched, rulesExcluded, winningRule, conflicts, missingData, renderedHtml }`.
- **Done when:** given a fixture org + rule set, the simulator output matches expected explanation
  traces exactly. This is your most important test suite.

> Phases 1–4 are pure, offline, and fully unit-testable. **Lock them before any OAuth work.**
> This is where Cursor is fastest and where regressions are cheapest to catch.

### Phase 5 — `packages/db` + control-plane API + admin UI
- Prisma schema (§3), migrations, tRPC routers for orgs/users/groups/templates/rules/campaigns.
- Admin console: template block editor (reorder/configure, no arbitrary nesting), rule builder,
  and the **simulator UI** (prominent). Preview against a real synced employee.
- **Done when:** an admin can create a template, write rules, and run the simulator end-to-end
  against seeded directory data — all before any external integration exists.

### Phase 6 — Google vertical slice (do Google FIRST — it has a real write API)
- `adapters-google`: OAuth (domain-wide delegation, restricted Gmail scopes), directory sync,
  compile per user+alias, `sendAs.update`, **read back + diff sanitized result**, retry via BullMQ.
- **Done when:** for a test Workspace domain, an admin clicks Deploy and Gmail signatures update
  for real, with a recorded sanitization diff per user.

### Phase 7 — Microsoft directory sync (`adapters-microsoft`)
- MSAL app-only auth; Graph sync of users/groups/manager/profile into the same data model.
- **Done when:** Entra users appear alongside Google users under one org model.

### Phase 8 — Outlook add-in
- Event-based activation (`OnNewMessageCompose`), `setSignatureAsync`; fetch compiled signature
  bundle from control plane; refresh on `OnMessageFromChanged` (gate on req set 1.13).
- Unified manifest for web/new-Windows/Mac-desktop; **plan an add-in-only manifest for Mac/mobile
  as a follow-up.** Central deployment via M365 Integrated Apps.
- **Done when:** composing a new mail in supported Outlook inserts the correct compiled signature,
  selected by the same rule engine used everywhere.

### Phase 9 — Deployment-health dashboard
- Surface: users discovered/assigned, Gmail updates OK, add-in assignments, last sync, missing-field
  users, OAuth/permission failures, Gmail sanitization diffs, add-in compatibility warnings, expired
  campaigns, broken images, recent failures. Each error: what failed · who · likely cause ·
  recommended fix · retry action.

### Phase 10 — Campaign scheduling + public free audit tool
- Date-ranged banners wired into the rule engine.
- Public audit: reuse `compiler`+`linter`+score with a simplified report. **Keep pasted signature
  HTML ephemeral/client-side** — no server storage of visitor PII (consistency with privacy stance).

---

## 6. Explicitly OUT of MVP scope
Server-side mail relay/transport stamping · live screenshot rendering lab · arbitrary free-form HTML
templates · multi-stage approval workflows · A/B campaign testing · conversion attribution · SCIM ·
custom role builder · recipient-level behavioral personalization · advanced HRIS · native mobile
apps · automated legal-policy generation.

The **Compliance tier** (server-side transport stamping for guaranteed 100% coverage) is a deliberate
post-MVP product line, positioned separately from the Privacy tier — not a bug to be fixed later.

---

## 7. How to drive Cursor with this plan
- Point Cursor at `docs/build-plan.md` + `.cursorrules` as always-on context.
- Work **one phase per session**. Do not let the agent start Phase 6+ (I/O) before Phases 1–4 pass.
- For the pure packages, prompt test-first: "write the failing Vitest cases from the acceptance
  criteria in Phase N, then implement until green."
- Never let the agent invent a Microsoft Graph signature write call — it does not exist (see §0).
- Every rule-engine change must keep the simulator explanation traces passing.
