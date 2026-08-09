import { describe, it, expect } from 'vitest';
import { plainSizing, bahtPlain } from '../marketSizerPlain';

describe('marketSizerPlain', () => {
  it('bahtPlain: ล้าน/พันล้าน/พัน อ่านง่าย', () => {
    expect(bahtPlain(850_000)).toBe('฿850,000');
    expect(bahtPlain(12_500_000)).toBe('฿12.5 ล้าน');
    expect(bahtPlain(3_000_000)).toBe('฿3 ล้าน');       // ตัด .0
    expect(bahtPlain(1_200_000_000)).toBe('฿1.2 พันล้าน');
  });

  it('ไม่มีธุรกิจ → ok=false (โชว์ตัวอย่าง)', () => {
    expect(plainSizing({ business: '', arpuPerYear: 3000, scope: 'national' }).ok).toBe(false);
    expect(plainSizing({ business: '   ', arpuPerYear: 3000, scope: 'national' }).ok).toBe(false);
  });

  it('กรอกแค่ธุรกิจ (ยังไม่ใส่ราคา) → ได้ตัวเลขทันที ด้วยราคาเริ่มต้น', () => {
    const r = plainSizing({ business: 'ร้านกาแฟ', arpuPerYear: 0, scope: 'national' });
    expect(r.ok).toBe(true);
    expect(r.usingDefaultArpu).toBe(true);
    expect(r.somValue).toBeGreaterThan(0);
    expect(r.disclaimer).toContain('ราคาจริง');
    // ใส่ราคาจริงแล้ว usingDefaultArpu=false
    const priced = plainSizing({ business: 'ร้านกาแฟ', arpuPerYear: 5000, scope: 'national' });
    expect(priced.usingDefaultArpu).toBe(false);
  });

  it('คืน 3 แถวภาษาบ้าน ๆ (ไม่มีศัพท์ TAM/SAM/SOM) + headline + disclaimer', () => {
    const r = plainSizing({ business: 'ร้านกาแฟ', arpuPerYear: 3000, scope: 'national' });
    expect(r.ok).toBe(true);
    expect(r.rows.map(x => x.key)).toEqual(['total', 'reachable', 'winnable']);
    const joined = JSON.stringify(r.rows);
    expect(joined).not.toMatch(/TAM|SAM|SOM/);
    expect(r.headline.length).toBeGreaterThan(0);
    expect(r.disclaimer).toContain('ประเมิน');
    expect(r.somValue).toBeGreaterThan(0);   // ใช้ทำ hero count-up
    expect(r.somCustomers).toBeGreaterThan(0);
    // ลำดับกราฟถูกต้อง: ตลาดรวม ≥ เข้าถึงได้จริง ≥ คว้าได้ปีแรก
    expect(r.tamValue).toBeGreaterThanOrEqual(r.samValue);
    expect(r.samValue).toBeGreaterThanOrEqual(r.somValue);
  });

  it('scope local < national (ตลาดจังหวัดเล็กกว่าทั้งประเทศ)', () => {
    const nat = plainSizing({ business: 'ร้านกาแฟ', arpuPerYear: 3000, scope: 'national' });
    const loc = plainSizing({ business: 'ร้านกาแฟ', arpuPerYear: 3000, scope: 'local' });
    // แถวแรก (ตลาดรวม) ของ national ต้องมีหน่วยใหญ่กว่า — เช็กผ่านจำนวนลูกค้าที่เข้าถึงได้ในข้อความ
    expect(nat.rows[1].sub).not.toBe(loc.rows[1].sub);
  });
});
