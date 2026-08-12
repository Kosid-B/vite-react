---
name: pdpa-design-by-de
description: "## Overview This skill defines the operational framework for developing, auditing, and maintaining Software-as-a-Service (SaaS) platforms for ISO standards (such as ISO 9001, ISO 14001, ISO 22301) and IDE systems. It embeds **Data Protection by Design and by Default (DPbDD)** under **Article 25 of the GDPR** and ISO privacy controls into every layer of the SaaS architecture, utilizing Supabase (Backend), domain-driven subdomains, Kanban workflow management, and Law of UX/UI design principles."
---

## 1. Core Architecture & Tech Stack Context
- **Backend**: Supabase (PostgreSQL, Row Level Security [RLS], Auth, Edge Functions, Realtime).
- **Architecture Pattern**: Multi-tenant or isolated schema SaaS structured via dedicated **Subdomains** per ISO standard module (e.g., `iso9001.yourcompany.com`, `iso14001.yourcompany.com`, `ide.yourcompany.com`).
- **Workflow Engine**: Kanban boards for tracking ISO compliance tasks, risk assessments, and non-conformity remediation.
- **UI/UX Standard**: Law of UX/UI (Fitts's Law, Hick's Law, Jakob's Law, Privacy by Design interface patterns).

---

## 2. Article 25 Requirements & SaaS Engineering Mapping

### 2.1 Article 25(1): Data Protection by Design
Controllers (and SaaS platform providers acting as enablers/processors) must implement appropriate technical and organisational measures designed to implement data protection principles effectively.

#### Technical Measures in Supabase & Subdomains:
- **Pseudonymization & Encryption**: Encrypt personal data at rest (Supabase Postgres encryption) and in transit (TLS). Implement hashing for audit logs and user activity tracking.
- **State of the Art**: Regularly update dependencies, Supabase clients, and security configurations to match current cryptographic and network standards.
- **Effectiveness & KPIs**: Implement automated compliance dashboards displaying quantitative metrics (e.g., reduction in unhandled data access requests, incident response times) and qualitative risk scores.

### 2.2 Article 2(2): Data Protection by Default
By default, the software configuration must ensure that only personal data necessary for each specific processing purpose is processed (Data Minimization).

#### Default Configurations in SaaS Subdomains:
- **Amount Collected**: Out-of-the-box form fields must be limited strictly to required ISO audit/management parameters. Surplus optional data fields must be disabled by default.
- **Storage Limitation**: Implement automated data retention and purging routines via Supabase cron/triggers based on ISO document control retention schedules (e.g., retaining audit logs only as long as required by ISO 9001).
- **Accessibility & Public Dissemination**: Personal data or internal audit records must **never** be made accessible to an indefinite number of natural persons or search engines by default (configure `robots.txt` / meta tags on public portals, enforce strict RLS policies on Supabase tables).

---

## 3. Operationalizing DPbDD Across ISO Principles in SaaS Modules

### Principle 1: Transparency (Articles 12-14, 34)
- **UX/UI Implementation**: Use multi-layered privacy notices, clear semantic language, and contextual pop-ups or tooltips in the SaaS UI when collecting user inputs. Avoid dark patterns or pre-checked consent boxes.
- **Subdomain Routing**: Dedicated transparency center accessible within 1 click from any ISO subdomain footer.

### Principle 2: Lawfulness (Article 6)
- **Workflow Integration**: Kanban cards for processing activities must explicitly tag the legal basis (e.g., Contract, Legal Obligation, Consent, Legitimate Interest) before moving a workflow state from "Backlog" to "In Progress".
- **Consent Management**: Electronic capture of consent with straightforward, equal-effort withdrawal mechanisms built into user profiles.

### Principle 3: Fairness
- **UX Design**: Avoid nudging users into over-sharing data. Ensure regular and premium tenant users have equal and indiscriminate access to exercise their GDPR rights (e.g., data export, correction).
- **Algorithmic Fairness**: If ISO risk prediction or AI document analysis is used, ensure human oversight loops are built into the Kanban review stages.

### Principle 4: Purpose Limitation (Article 5.1.b)
- **Database Architecture**: Map data fields in Supabase schemas directly to specific ISO process objectives. Prevent cross-module data leaks between unrelated subdomains (e.g., ISO 14001 environmental data must not be repurposed for unassociated ISO 27001 marketing analytics without separate legal grounds).

### Principle 5: Data Minimization (Article 5.1.c)
- **Form Design**: Apply minimalist input fields. For instance, in an ISO training attendance log, collect only names and roles—avoid unnecessary birthdates or home addresses.
- **Anonymization**: Automatically strip direct identifiers when exporting data for statistical or industry benchmarking reports.

### Principle 6: Accuracy (Article 5.1.d)
- **Validation Rules**: Enforce strict frontend and backend validation rules in Supabase. Provide audit trail logs and easy user profile access to rectify inaccurate records immediately.

### Principle 7: Storage Limitation (Article 5.1.e)
- **Automated Lifecycle**: Configure automated deletion scripts in Supabase for temporary logs, outdated audit drafts, and terminated employee credentials based on predefined retention policies.

### Principle 8: Integrity & Confidentiality (Security - Article 5.1.f & Article 32)
- **Supabase RLS (Row Level Security)**: Enforce strict tenant isolation and role-based access control (RBAC) across all subdomains.
- **ISMS Integration**: Align SaaS security features with ISO/IEC 27001 standards, including automated intrusion detection logging, secure encrypted backups, and incident response management workflows on Kanban boards.

---

## 4. Certification, Accountability, and Collaboration
- **Article 42 Certification**: Design SaaS features to support future ISO and GDPR certification seals, providing a competitive advantage for B. Training Consultant.
- **Vendor Accountability**: Provide clear documentation and KPIs to clients demonstrating how the SaaS architecture fulfills Article 25 compliance requirements.