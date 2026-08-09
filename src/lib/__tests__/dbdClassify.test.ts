import { describe, it, expect } from 'vitest';
import { classifyDbd, storefrontText } from '../dbdClassify';

describe('classifyDbd — แมปข้อความ → หมวด DBD', () => {
  it('ร้านกาแฟ → [I] ร้านกาแฟและเครื่องดื่ม', () => {
    const g = classifyDbd('ร้านกาแฟสดคั่วเอง คาเฟ่บรรยากาศดี');
    expect(g?.code).toBe('I');
    expect(g?.value).toBe('[I] ร้านกาแฟและเครื่องดื่ม');
    expect(g?.confidence).toBe('medium');   // 'กาแฟ' + 'คาเฟ่' = 2 hits → medium
  });
  it('ร้านอาหาร → หมวด I (อาหาร)', () => {
    expect(classifyDbd('ร้านอาหารตามสั่ง ก๋วยเตี๋ยว')?.code).toBe('I');
  });
  it('ซอฟต์แวร์/แอป → [J] พัฒนาซอฟต์แวร์', () => {
    const g = classifyDbd('รับพัฒนาซอฟต์แวร์และแอปพลิเคชัน เขียนเว็บไซต์');
    expect(g?.code).toBe('J');
    expect(g?.item).toContain('ซอฟต์แวร์');
  });
  it('การตลาด/เอเจนซี → [M] โฆษณาและการตลาด', () => {
    expect(classifyDbd('รับทำการตลาดออนไลน์ ยิงแอด โฆษณา')?.code).toBe('M');
  });
  it('ทำผม/เสริมสวย → [S] บริการส่วนบุคคล', () => {
    expect(classifyDbd('ร้านทำผม เสริมสวย ทำเล็บ')?.code).toBe('S');
  });
  it('คลินิก/หมอ → หมวด Q (สุขภาพ)', () => {
    expect(classifyDbd('คลินิกเวชกรรม รักษาโดยแพทย์')?.code).toBe('Q');
  });
  it('ขายเสื้อผ้าออนไลน์ → หมวด G (ค้าปลีก)', () => {
    expect(classifyDbd('ขายเสื้อผ้าแฟชั่นออนไลน์')?.code).toBe('G');
  });
  it('เฉพาะเจาะจงชนะทั่วไป: "ขายกาแฟ" → I (กาแฟ) ไม่ใช่ G (ขาย)', () => {
    // กาแฟ(I)=1, ขาย→"ขายของ"? ไม่ตรง; ควรได้ I
    expect(classifyDbd('ขายกาแฟสด')?.code).toBe('I');
  });
  it('ข้อความว่าง / จับไม่ได้ → null', () => {
    expect(classifyDbd('')).toBeNull();
    expect(classifyDbd('   ')).toBeNull();
    expect(classifyDbd('xyzzy zzz')).toBeNull();
  });
  it('value ใช้เก็บลง storefront.dbd ได้ (รูปแบบ [X] item)', () => {
    const g = classifyDbd('ฟิตเนส ยิม โยคะ');
    expect(g?.value).toMatch(/^\[[A-S]\] .+/);
    expect(g?.sectorLabel.length).toBeGreaterThan(0);
  });
});

describe('storefrontText — รวมข้อความจากหน้าร้าน', () => {
  it('รวมชื่อ + คำอธิบาย + จุดขาย + สินค้า', () => {
    const t = storefrontText({
      name: 'ร้านกาแฟดี', description: 'กาแฟสด', vp: 'คั่วเองทุกวัน',
      services: ['เอสเพรสโซ', 'ลาเต้'], products: [{ name: 'ดริป', desc: 'คั่วอ่อน' }],
    });
    expect(t).toContain('ร้านกาแฟดี');
    expect(t).toContain('ดริป');
    expect(classifyDbd(t)?.code).toBe('I');
  });
  it('ว่างทุกช่อง → string ว่าง → classify คืน null', () => {
    expect(storefrontText({})).toBe('');
    expect(classifyDbd(storefrontText({}))).toBeNull();
  });
});
