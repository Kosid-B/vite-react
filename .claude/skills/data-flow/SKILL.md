---
name: data-flow
description: "สถาปัตยกรรมการไหลของข้อมูล (Data Flow) สำหรับ SaaS บน Supabase — ออกแบบเส้นทางข้อมูลตั้งแต่ต้นทางถึงปลายทาง สิทธิ์ RLS จุดที่ข้อมูลถูกเขียน/อ่าน และการแยกข้อมูลระหว่างผู้ใช้ · ใช้เมื่อออกแบบตาราง เพิ่ม RPC เชื่อมระบบภายนอก หรือตรวจว่าข้อมูลรั่วข้ามผู้ใช้ได้ไหม"
---

title: Data Flow Architecture & Design Skill
version: 1.0
category: Software Engineering
tags: [SaaS, DataFlow, TIS-Automate, Supabase]
---

# Skill Guide: Data Flow Architecture & Design

## 1. Core Objective
The objective of this skill is to design, document, and implement robust data flows for SaaS applications, specifically tailored for TIS Automate systems. Data flow design must prioritize data integrity, multi-tenancy, and compliance-driven logic.

## 2. The Data Flow Lifecycle (Design Framework)
When designing a data flow, strictly follow these phases:

### Phase A: Input & Capture (The "Edge")
- Identify the source: User-facing UI, IoT/Sensor, or API Webhook.
- Data Enrichment: Automatically attach context (`tenant_id`, `user_id`, `timestamp`) at the point of ingestion.

### Phase B: Processing & Validation (The "Brain")
- **Standardization:** Map inputs to standardized schemas (e.g., TIS-specific attributes).
- **Constraints:** Apply business rules (e.g., TIS 50-2565 specs).
- **Security:** Ensure RLS enforcement before passing to the storage layer.

### Phase C: Storage & Persistence (The "Core")
- Structured storage (PostgreSQL/Supabase) for transactional integrity.
- Use atomic transactions for related records (e.g., Compliance record + Audit log).

### Phase D: Post-Processing & Output (The "Action")
- Trigger events for downstream tasks (e.g., PDF report generation, email notifications).
- Ensure async processing for long-running tasks to prevent UI blocking.

## 3. Best Practices for Professional Documentation
- **Visuals:** Use DFD (Data Flow Diagram) logic. Define:
    - **Entity:** Who/What starts the flow.
    - **Process:** What calculation/validation occurs.
    - **Store:** Where data is held.
    - **Flow:** The direction of data movement.
- **Naming Conventions:** Use clear, descriptive names (e.g., `process_steel_inspection_data`).
- **Error Handling:** Every flow must include an "Error Path" (e.g., what happens if validation fails?).

## 4. Implementation Checklist
- [ ] Does this flow respect the `tenant_id` isolation constraint?
- [ ] Is the data being validated against the correct TIS standard?
- [ ] Is there an audit trail for this transaction?
- [ ] Is the flow designed for asynchronous execution where appropriate?

## 5. Prompting Strategy for AI
When requesting AI to help with Data Flow design, use this format:
1. **Context:** Describe the module (e.g., "TIS 50-2565 steel inspection").
2. **Goal:** Define the start and end states.
3. **Constraints:** Mention specific technical requirements (e.g., "Must use Supabase Edge Functions").
4. **Output:** Request a specific representation (e.g., "Create a sequence diagram in MermaidJS").