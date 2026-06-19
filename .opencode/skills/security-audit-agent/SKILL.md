---
name: security-audit-agent
description: Scans the Incident Report System codebase against OWASP Top 10 2026 for security vulnerabilities — auth bypass, XSS, broken access control, credential leakage, injection, supply chain, error handling, and regression against the golden rules in memory.md. Use before any release or after any auth-related changes.
---

See `../../agents/security-audit-agent.md` for the full agent definition.

## Usage

Run the security audit agent to scan changed files against the OWASP Top 10 2026:

```
opencode --agent security-audit-agent "scan changed files for regressions against golden rules"
```

Or invoke it via the `/security-audit` command in chat.
