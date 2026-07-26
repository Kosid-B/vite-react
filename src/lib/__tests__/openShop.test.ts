import { describe, it, expect } from 'vitest';
import { openShopPrompt, parseShopDraft, shopDraftLocal } from '../openShop';

describe('openShop — PoC "เปิดร้านให้ฉัน"', () => {
  it('openShopPrompt ใส่เป้าหมายลง context + สั่งให้ตอบ JSON', () => {
    const { instruction, context } = openShopPrompt('ขายกาแฟคั่ว');
    expect(context).toContain('ขายกาแฟคั่ว');
    expect(instruction).toMatch(/JSON/);
    expect(instruction).toContain('"name"');
  });

  it('parseShopDraft อ่าน JSON ล้วนได้', () => {
    const d = parseShopDraft('{"name":"ร้านกาแฟดี","dbd":"เครื่องดื่ม","description":"คั่วสด","services":["เมล็ดกาแฟ","ดริป"],"vp":"กาแฟสดใหม่ทุกวัน"}');
    expect(d?.name).toBe('ร้านกาแฟดี');
    expect(d?.services).toEqual(['เมล็ดกาแฟ', 'ดริป']);
    expect(d?.vp).toBe('กาแฟสดใหม่ทุกวัน');
  });

  it('parseShopDraft ทนข้อความห่อหน้า/หลัง JSON', () => {
    const d = parseShopDraft('นี่คือข้อมูลร้านครับ:\n{"name":"ร้าน A","services":["x"]}\nหวังว่าจะช่วยได้');
    expect(d?.name).toBe('ร้าน A');
    expect(d?.services).toEqual(['x']);
  });

  it('parseShopDraft คืน null เมื่อไม่มี JSON หรือไม่มีชื่อ', () => {
    expect(parseShopDraft('ไม่มี json เลย')).toBeNull();
    expect(parseShopDraft('{"dbd":"x"}')).toBeNull(); // ไม่มี name
    expect(parseShopDraft('')).toBeNull();
  });

  it('parseShopDraft ตัด services เกิน 6 + กันฟิลด์ยาวเกิน', () => {
    const many = JSON.stringify({ name: 'n'.repeat(200), services: Array.from({ length: 10 }, (_, i) => `s${i}`) });
    const d = parseShopDraft(many)!;
    expect(d.name.length).toBeLessThanOrEqual(80);
    expect(d.services.length).toBe(6);
  });

  it('shopDraftLocal ให้ผลไม่มือเปล่าจากเป้าหมาย', () => {
    const d = shopDraftLocal('ขายเสื้อผ้ามือสอง');
    expect(d.name).toContain('ขายเสื้อผ้ามือสอง');
    expect(d.vp).toContain('ขายเสื้อผ้ามือสอง');
    expect(d.description).not.toBe('');
  });

  it('shopDraftLocal กันเป้าหมายว่าง', () => {
    const d = shopDraftLocal('   ');
    expect(d.name).toBe('ธุรกิจของฉัน');
  });
});
