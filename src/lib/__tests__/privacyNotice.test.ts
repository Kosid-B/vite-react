import { describe, it, expect } from 'vitest';
import {
  normalizeInput, buildPrivacyNoticeDraft, buildSopDraft, buildDraft,
  privacyUserPrompt, privacySystemPrompt, type PrivacyInput,
} from '../privacyNotice';

const base: PrivacyInput = {
  bizName: 'ร้านกาแฟดี',
  bizType: 'ร้านกาแฟ',
  dataCollected: ['ชื่อ', 'เบอร์โทร'],
  purposes: ['สะสมแต้ม', 'แจ้งโปรโมชัน'],
  thirdParties: ['ผู้ให้บริการขนส่ง'],
  contactEmail: 'hi@coffee.co',
};

describe('privacyNotice', () => {
  it('normalizeInput เติม default เมื่อ array ว่าง', () => {
    const n = normalizeInput({ bizName: '', dataCollected: [], purposes: [] });
    expect(n.bizName).toBe('องค์กรของเรา');
    expect(n.dataCollected.length).toBeGreaterThan(0);
    expect(n.purposes.length).toBeGreaterThan(0);
    expect(n.docType).toBe('privacy');
  });

  it('Privacy Notice มีหัวข้อ PDPA ครบ + ใส่ข้อมูลจริง', () => {
    const doc = buildPrivacyNoticeDraft(base);
    expect(doc).toContain('ร้านกาแฟดี');
    expect(doc).toContain('พ.ศ. 2562');
    expect(doc).toContain('สิทธิของเจ้าของข้อมูล');
    expect(doc).toContain('เบอร์โทร');       // dataCollected
    expect(doc).toContain('สะสมแต้ม');        // purposes
    expect(doc).toContain('ผู้ให้บริการขนส่ง'); // thirdParties
    expect(doc).toContain('hi@coffee.co');    // contact
  });

  it('ไม่มี thirdParties → ใช้ประโยคว่าไม่เปิดเผย', () => {
    const doc = buildPrivacyNoticeDraft({ ...base, thirdParties: [] });
    expect(doc).toContain('ไม่เปิดเผยข้อมูลของท่านแก่บุคคลภายนอก');
  });

  it('SOP draft = เอกสาร SOP จัดการคำขอใช้สิทธิ', () => {
    const doc = buildSopDraft(base);
    expect(doc).toContain('SOP');
    expect(doc).toContain('30 วัน');
    expect(doc).toContain('ร้านกาแฟดี');
  });

  it('buildDraft เลือกชนิดตาม docType', () => {
    expect(buildDraft({ ...base, docType: 'sop' })).toContain('SOP');
    expect(buildDraft({ ...base, docType: 'privacy' })).toContain('Privacy Notice');
    expect(buildDraft(base)).toContain('Privacy Notice'); // default
  });

  it('prompt สำหรับ AI มี system + user ที่ฝังร่างตั้งต้น', () => {
    expect(privacySystemPrompt()).toContain('PDPA');
    const u = privacyUserPrompt(base);
    expect(u).toContain('ร้านกาแฟดี');
    expect(u).toContain('Privacy Notice'); // ฝังร่างตั้งต้น
  });
});
