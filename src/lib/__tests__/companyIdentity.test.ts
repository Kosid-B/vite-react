import { describe, it, expect } from 'vitest';
import {
  monogram, paletteFor, logoSvg, localNameProposals, proposalsFromAi, nameProposalPrompt,
  parseAiNameSuggestions,
} from '../companyIdentity';

describe('companyIdentity', () => {
  it('monogram: 1 คำ → 2 อักษรแรก, 2 คำ → อักษรแรกของแต่ละคำ', () => {
    expect(monogram('Nova')).toBe('NO');
    expect(monogram('Nova Labs')).toBe('NL');
    expect(monogram('  ')).toBe('?');
  });

  it('paletteFor deterministic ต่อชื่อเดียว', () => {
    expect(paletteFor('Nova Labs')).toEqual(paletteFor('Nova Labs'));
    expect(paletteFor('A').bg).not.toBe(paletteFor('Zzzz').bg);
  });

  it('logoSvg = SVG valid + มี monogram + escape XSS', () => {
    const svg = logoSvg('Nova Labs');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('NL');
    const evil = logoSvg('<script>x</script> Co');
    expect(evil).not.toContain('<script>');   // ต้อง escape
  });

  it('logoSvg deterministic', () => {
    expect(logoSvg('Verity Group')).toBe(logoSvg('Verity Group'));
  });

  it('localNameProposals: จำนวนตามขอ + ชื่อไม่ซ้ำ + มีโลโก้/เหตุผล', () => {
    const ps = localNameProposals({ industry: 'ร้านกาแฟ', goal: 'ขยายสาขา ขายกาแฟคุณภาพ' }, 4);
    expect(ps).toHaveLength(4);
    expect(new Set(ps.map(p => p.name.toLowerCase())).size).toBe(4); // ไม่ซ้ำ
    for (const p of ps) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.logoSvg.startsWith('<svg')).toBe(true);
      expect(p.rationale.length).toBeGreaterThan(0);
    }
  });

  it('localNameProposals deterministic ต่อ context เดียว', () => {
    const ctx = { industry: 'ฟินเทค', goal: 'ระบบชำระเงิน' };
    expect(localNameProposals(ctx).map(p => p.name)).toEqual(localNameProposals(ctx).map(p => p.name));
  });

  it('proposalsFromAi: กรองชื่อว่าง + เติมโลโก้', () => {
    const ps = proposalsFromAi([
      { name: 'Lumen Co', tagline: 'สว่างทุกก้าว', rationale: 'จำง่าย' },
      { name: '  ' }, // ต้องถูกกรอง
      { name: 'Prime AI' },
    ]);
    expect(ps).toHaveLength(2);
    expect(ps[0].logoSvg).toContain('<svg');
    expect(ps[1].name).toBe('Prime AI');
  });

  it('nameProposalPrompt มีหลัก CI + รูปแบบ suggestions', () => {
    const p = nameProposalPrompt({ industry: 'ร้านอาหาร', goal: 'แฟรนไชส์' });
    expect(p).toContain('Corporate Identity');
    expect(p).toContain('suggestions');
  });

  it('parseAiNameSuggestions: แยก "ชื่อ — เหตุผล" + ตัดเลขลำดับ + ไม่ซ้ำ + เติมโลโก้', () => {
    const ps = parseAiNameSuggestions([
      '1. Lumen Co — สว่างทุกก้าว จำง่าย',
      'Prime AI — โดดเด่น เป็นสากล',
      'Lumen Co — ซ้ำ ต้องถูกกรอง',
      '   ',
    ]);
    expect(ps).toHaveLength(2);
    expect(ps[0].name).toBe('Lumen Co');
    expect(ps[0].rationale).toContain('สว่าง');
    expect(ps[1].name).toBe('Prime AI');
    expect(ps[0].logoSvg).toContain('<svg');
  });
});
