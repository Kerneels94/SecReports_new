# Team Rules

## Ponytail
Ponytail mode is ALWAYS active (level: full) on every session. See the ponytail skill. Never drift back to over-building. If unsure, read the problem first, then take the laziest solution that works.

## Response format
Every response must be small sections of readable text, not large blobs. Use this shape:
- **Problem** — what's wrong, one or two lines.
- **Solution** — the smallest fix that works.
- **Side effects** — what else it touches or risks.
- **Tests** — what was run first to verify.

## Session Startup
Load ALL skills at the start of every session. Skills provide specialized instructions and workflows for specific tasks. Use the skill tool to load a skill when a task matches its description.

On every prompt, always load and apply both `caveman` (terse output) and `ponytail` (laziest working solution). These two are mandatory, not optional.

<available_skills>
  <skill>
    <name>caveman</name>
    <description>Terse caveman voice: answer first, fluff gone, every technical fact kept. Use for /caveman, "caveman mode", "talk like caveman", "be brief", "less tokens". Stays on until "stop caveman" or "normal mode".</description>
    <location>D:\Programming\SecReportsNew\.opencode\skills\caveman\SKILL.md</location>
  </skill>
  <skill>
    <name>ponytail</name>
    <description>Forces the laziest solution that actually works, simplest, shortest, most minimal. Use on ANY coding task: writing, adding, refactoring, fixing, reviewing, or designing code.</description>
    <location>C:\Users\corri\.cache\opencode\packages\@dietrichgebert\ponytail@latest\node_modules\@dietrichgebert\ponytail\skills\ponytail\SKILL.md</location>
  </skill>
  <skill>
    <name>frontend</name>
    <description>Generates Next.js frontend code (pages, components, hooks, services, lib) with Tailwind CSS, TypeScript strict mode, and Jest + React Testing Library tests. Use for any frontend/UI task in the Incident Report System.</description>
    <location>D:\Programming\SecReportsNew\.opencode\skills\frontend\SKILL.md</location>
  </skill>
  <skill>
    <name>mongodb</name>
    <description>Generates and manages the database layer — Prisma schema, seed files, data-access helpers — for MongoDB in the Incident Report System. Use for any database/schema/Prisma task.</description>
    <location>D:\Programming\SecReportsNew\.opencode\skills\mongodb\SKILL.md</location>
  </skill>
  <skill>
    <name>nodejs</name>
    <description>Generates Node.js backend code (Fastify routes, controllers, services, middleware, validators) with TypeScript strict mode, JWT auth, Prisma ORM (MongoDB), and Jest tests. Use for any backend/API task in the Incident Report System.</description>
    <location>D:\Programming\SecReportsNew\.opencode\skills\nodejs\SKILL.md</location>
  </skill>
  <skill>
    <name>security-audit-agent</name>
    <description>Scans the Incident Report System codebase against OWASP Top 10 2026 for security vulnerabilities — auth bypass, XSS, broken access control, credential leakage, injection, supply chain, error handling, and regression against the golden rules in memory.md. Use before any release or after any auth-related changes.</description>
    <location>D:\Programming\SecReportsNew\.opencode\skills\security-audit-agent\SKILL.md</location>
  </skill>
</available_skills>

## Workflow
Tests first, after understanding the problem.