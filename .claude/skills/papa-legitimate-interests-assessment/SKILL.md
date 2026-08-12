---
name: papa-legitimate-interests-assessment
description: "This skill defines the technical, legal, and operational framework for designing, implementing, and documenting **Legitimate Interests (GDPR Article 6(1)(f))** within Software-as-a-Service (SaaS) platforms built for ISO standards (ISO 9001, ISO 14001, ISO 22301) and IDE systems. It integrates the three-part legal test—**Legitimate Interest Purpose**, **Necessity**, and **Balancing Test (Proportionality & Safeguards)**—into Supabase backend architectures, subdomain structures, Kanban workflow engines, and Law of UX/UI interface patterns."
---

---

## 1. Core Architecture & Tech Stack Context
- **Backend**: Supabase (PostgreSQL, Row Level Security [RLS], Triggers, Edge Functions).
- **Architecture Pattern**: Multi-tenant or isolated schema SaaS structured via dedicated **Subdomains** per ISO standard module (e.g., `iso9001.yourcompany.com`, `iso14001.yourcompany.com`, `ide.yourcompany.com`).
- **Workflow Engine**: Kanban boards tracking ISO compliance lifecycle, risk assessments, and Legitimate Interest Assessment (LIA) documentation milestones.
- **UI/UX Standard**: Law of UX/UI (transparent notifications, explicit objection mechanisms, friction-free opt-outs).

---

## 2. The Three-Tiered Legitimate Interests Test (Article 6(1)(f)) in SaaS Engineering

### 2.1 Purpose (Existence of a Legitimate Interest)
The processing purpose must be real, present, clearly articulated, and lawful.
- **SaaS Implementation**: In ISO management modules, every background data processing activity (e.g., audit logging, security tracking, vendor risk profiling) must be linked to a documented business or compliance purpose stored in a Supabase `lia_records` table.
- **Valid vs. Invalid Categories (Derived from EEA Case Law)**:
  * *Lawful Examples*: Network/information security (Recital 49), internal administrative transfers within corporate groups (Recital 48), debt collection under valid contracts, employee access monitoring for confidential asset protection, background checks via authorized third-party channels.
  * *Unlawful Examples*: Unlimited global publication of WHOIS data, intrusive employee keylogging, unconstrained tracking across multiple sites without opt-outs, mega-databases created purely for third-party commercial data brokering.

### 2.2 Necessity (Strict Necessity Test)
Data processing must be strictly necessary to achieve the stated purpose; if the goal can be achieved via less intrusive means, legitimate interests cannot be invoked.
- **SaaS Implementation**: Supabase database schemas must enforce strict data minimization. Form fields and telemetry collection must be restricted to essential parameters. Features collecting surplus or sensitive data by default must be disabled.

### 2.3 Balancing Test & Safeguards (Proportionality)
The controller's interest must not be overridden by the fundamental rights and freedoms of the data subject.
- **SaaS Safeguards**: Implement robust technical safeguards in Supabase and UI layers:
  * Pseudonymization and encryption at rest/transit.
  * Granular role-based access control (RBAC) and RLS.
  * Multi-layered privacy notices and transparent disclosure within 1 click on every subdomain.
  * Automated right to object (Article 21) workflows integrated into user dashboards, allowing instant cessation or review of processing unless compelling legitimate grounds override the objection.

---

## 3. Operationalizing LIA in ISO SaaS Kanban Workflows
- **Kanban Column States**: `LIA Backlog` → `Necessity & Purpose Mapping` → `Safeguard Implementation (RLS/Encryption)` → `DPA / Documentation Review` → `Production Active`.
- **Audit Trails**: Maintain automated logs in Supabase tracking when LIAs were approved, reviewed, and tested against changing technological states ("state of the art").