import { describe, it, expect } from 'vitest';
import {
  heuristicCheck, readinessScore, gaps, compliancePrompt,
  parseComplianceJson, complianceSystemPrompt, ISO9001_CLAUSES,
} from '../complianceCheck';

describe('complianceCheck', () => {
  it('heuristicCheck: เอกสารครบ → หลายข้อ covered', () => {
    const doc = 'เรามีนโยบายคุณภาพ และผู้นำแสดงความมุ่งมั่น มีการตรวจติดตามภายใน (internal audit) และทบทวนฝ่ายบริหาร ' +
      'มีการฝึกอบรมและเอกสารสารสนเทศ ประเมินความเสี่ยงและวัตถุประสงค์คุณภาพ มีปฏิบัติการแก้ไข corrective action';
    const r = heuristicCheck(doc);
    expect(r).toHaveLength(ISO9001_CLAUSES.length);
    expect(r.filter(x => x.status === 'covered').length).toBeGreaterThan(0);
    expect(readinessScore(r)).toBeGreaterThan(0);
  });

  it('heuristicCheck: เอกสารว่าง → ทุกข้อ missing, score 0', () => {
    const r = heuristicCheck('');
    expect(r.every(x => x.status === 'missing')).toBe(true);
    expect(readinessScore(r)).toBe(0);
    expect(gaps(r)).toHaveLength(r.length);
  });

  it('readinessScore: covered=1 partial=0.5 missing=0', () => {
    const r = [
      { id: '4', title: 'a', status: 'covered' as const, note: '' },
      { id: '5', title: 'b', status: 'partial' as const, note: '' },
      { id: '6', title: 'c', status: 'missing' as const, note: '' },
    ];
    expect(readinessScore(r)).toBe(50); // (1+0.5+0)/3 = 0.5
    expect(gaps(r)).toHaveLength(2);
  });

  it('compliancePrompt: ฝังเอกสาร + ตัดความยาว ≤ 8000', () => {
    const long = 'ก'.repeat(9000);
    const p = compliancePrompt(long, 'iso9001');
    expect(p).toContain('ISO 9001:2015');
    expect(p.includes('ก'.repeat(8000))).toBe(true);
    expect(p.includes('ก'.repeat(8001))).toBe(false); // ตัดที่ 8000
    expect(complianceSystemPrompt()).toContain('auditor');
  });

  it('parseComplianceJson: แปลง + เติม title + กัน status เพี้ยน', () => {
    const out = parseComplianceJson('{"results":[{"id":"9","status":"covered","note":"มี audit"},{"id":"10","status":"weird"}],"summary":"ok"}', 'iso9001');
    expect(out).not.toBeNull();
    expect(out!.results[0].title).toContain('การประเมินสมรรถนะ');
    expect(out!.results[1].status).toBe('missing'); // 'weird' → missing
    expect(out!.summary).toBe('ok');
  });

  it('parseComplianceJson: ข้อความไม่ใช่ JSON → null', () => {
    expect(parseComplianceJson('ขอโทษครับ ไม่มี JSON', 'iso9001')).toBeNull();
  });
});
