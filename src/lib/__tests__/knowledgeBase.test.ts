import { describe, it, expect } from 'vitest';
import { tokens, retrieve, buildContext, ragInstruction, KNOWLEDGE } from '../knowledgeBase';

describe('knowledgeBase', () => {
  it('tokens: แตกคำไทย (n-gram) + อังกฤษ + ตัด stopword', () => {
    const t = tokens('internal audit การตรวจ');
    expect(t).toContain('internal');
    expect(t).toContain('audit');
    expect(t.some(x => 'การตรวจ'.includes(x))).toBe(true);
    expect(t).not.toContain('การ'); // stopword
  });

  it('retrieve: คำถาม internal audit → เจอ ISO ข้อ 9', () => {
    const r = retrieve('ต้องทำ internal audit ตอนไหน');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].id).toBe('iso-9');
  });

  it('retrieve: คำถามสิทธิลบข้อมูล → เจอ PDPA rights', () => {
    const r = retrieve('เจ้าของข้อมูลขอลบข้อมูลได้ไหม');
    expect(r.some(c => c.id === 'pdpa-rights')).toBe(true);
  });

  it('retrieve: กรอง topic ได้', () => {
    const r = retrieve('นโยบาย ความมุ่งมั่น ผู้นำ', 4, 'iso9001');
    expect(r.every(c => c.topic === 'iso9001')).toBe(true);
  });

  it('retrieve: จำกัด k', () => {
    expect(retrieve('ข้อมูล มาตรฐาน คุณภาพ ความปลอดภัย', 2).length).toBeLessThanOrEqual(2);
  });

  it('retrieve: query ว่าง / ไม่ตรงเลย → []', () => {
    expect(retrieve('')).toEqual([]);
    expect(retrieve('xyzzy zzzq')).toEqual([]);
  });

  it('buildContext: มี [ref] + source', () => {
    const ctx = buildContext(retrieve('corrective action ปฏิบัติการแก้ไข'));
    expect(ctx).toContain('[1]');
    expect(ctx).toContain('ISO 9001:2015');
    expect(buildContext([])).toContain('ไม่พบ');
  });

  it('ragInstruction: สั่งอ้างอิงเฉพาะ context + ห้ามเดา', () => {
    const ins = ragInstruction('ISO ข้อ 9 คืออะไร');
    expect(ins).toContain('อ้างอิงเฉพาะข้อมูลใน context');
    expect(ins).toContain('ISO ข้อ 9 คืออะไร');
  });

  it('ฐานความรู้ครบ ISO ข้อ 4–10 + PDPA', () => {
    for (const id of ['iso-4', 'iso-5', 'iso-6', 'iso-7', 'iso-8', 'iso-9', 'iso-10'])
      expect(KNOWLEDGE.find(c => c.id === id)).toBeTruthy();
    expect(KNOWLEDGE.some(c => c.topic === 'pdpa')).toBe(true);
  });
});
