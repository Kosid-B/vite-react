import { describe, it, expect } from 'vitest';
import { proofCardSvg } from '../proofCard';

describe('proofCard', () => {
  it('มีชื่อบริษัท + สถิติ + brand + ลิงก์ ในการ์ด', () => {
    const svg = proofCardSvg({ companyName: 'ร้านกาแฟดี', statValue: '12', statLabel: 'ดีลปิดแล้ว', url: 'ceoaithailand.org' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('ร้านกาแฟดี');
    expect(svg).toContain('>12<');
    expect(svg).toContain('ดีลปิดแล้ว');
    expect(svg).toContain('สร้างด้วย CEO AI Thailand');
    expect(svg).toContain('1200');
  });

  it('escape อักขระพิเศษ (กัน XSS/SVG พัง)', () => {
    const svg = proofCardSvg({ companyName: '<script>&"x', statValue: '1', statLabel: 'a', url: 'b' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('&amp;');
  });

  it('subline โชว์เฉพาะเมื่อมี', () => {
    expect(proofCardSvg({ companyName: 'A', statValue: '1', statLabel: 'x', url: 'u' })).not.toContain('font-size="26">');
    const withSub = proofCardSvg({ companyName: 'A', statValue: '1', statLabel: 'x', subline: 'เยี่ยม', url: 'u' });
    expect(withSub).toContain('เยี่ยม');
  });

  it('ชื่อยาวถูกตัด (ไม่ล้นการ์ด)', () => {
    const long = 'ก'.repeat(60);
    const svg = proofCardSvg({ companyName: long, statValue: '1', statLabel: 'x', url: 'u' });
    expect(svg).toContain('…');
  });
});
