import { describe, it, expect, beforeEach } from 'vitest';
import { stashHandoff, readPendingHandoff, clearPendingHandoff, applyPendingHandoff } from '../handoffClient';
import { DEFAULT_DATA } from '../../data';
import type { HandoffPlan } from '../../../supabase/functions/_shared/handoff';

/* ปิดลูป Context Handoff ฝั่ง client — stash → apply-on-first-load → ล้าง (one-shot) */

const plan: HandoffPlan = { businessName: 'ร้านใหม่', sector: 'ค้าปลีก', valueProp: 'VP', mvbp: 'MVBP', goal: 'โต 2 เท่า' };

describe('handoffClient — stash/read/clear', () => {
  beforeEach(() => localStorage.clear());

  it('ยังไม่มี stash → readPendingHandoff = null', () => {
    expect(readPendingHandoff()).toBeNull();
  });
  it('stash แล้วอ่านคืนได้ + clear แล้วหาย', () => {
    stashHandoff(plan);
    expect(readPendingHandoff()?.businessName).toBe('ร้านใหม่');
    clearPendingHandoff();
    expect(readPendingHandoff()).toBeNull();
  });
});

describe('applyPendingHandoff', () => {
  beforeEach(() => localStorage.clear());

  it('ไม่มี stash → คืน null (ไม่แตะ data)', () => {
    expect(applyPendingHandoff(DEFAULT_DATA)).toBeNull();
  });

  it('มี stash → pre-fill aiCompany + ล้าง stash (one-shot)', () => {
    stashHandoff(plan);
    const next = applyPendingHandoff(DEFAULT_DATA);
    expect(next).not.toBeNull();
    expect(next!.aiCompany.name).toBe('ร้านใหม่');
    expect(next!.aiCompany.industry).toBe('ค้าปลีก');
    expect(next!.aiCompany.productDesc).toBe('VP — MVBP');
    // one-shot: apply ครั้งที่สองไม่มีอะไรเหลือ
    expect(readPendingHandoff()).toBeNull();
    expect(applyPendingHandoff(DEFAULT_DATA)).toBeNull();
  });

  it('ไม่กลายพันธุ์ DEFAULT_DATA เดิม', () => {
    stashHandoff(plan);
    applyPendingHandoff(DEFAULT_DATA);
    expect(DEFAULT_DATA.aiCompany.name).not.toBe('ร้านใหม่');
  });
});
