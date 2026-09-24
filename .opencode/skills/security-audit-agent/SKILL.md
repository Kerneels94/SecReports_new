---
name: security-audit-agent
description: Scans the Incident Report System codebase against OWASP Top 10 2026 for security vulnerabilities — including Broken Access Control (A01), Security Misconfigurations (A02), Software Supply Chain Failures (A03), Cryptographic Failures (A04), Injection (SQLi/XSS/Command Injection) (A05), Insecure Design (A06), Identification & Authentication Failures (A07), Software/Data Integrity Failures (A08), Security Logging & Alerting Failures (A09), and Mishandling of Exceptional Conditions (A10), alongside regression checks against golden rules in memory.md. Use before any release or after any auth-related changes.
---

See `../../agents/security-audit-agent.md` for the full agent definition.

## Usage

Run the security audit agent to scan changed files against the OWASP Top 10 2026:
