import { describe, it, expect } from 'vitest';
import { workspaceOps, opsTotals, opsCsv, opsTsv, type OpsRow } from '../adminOps';
import { DEFAULT_DATA } from '../../data';
import type { AppData } from '../../types';

/* สรุปผลดำเนินงานฝั่ง Admin → บอร์ดใช้ตัดสินใจ + export ลง Google Sheets — ตัวเลข/escape ต้องเชื่อได้ */

const ws = (over: Partial<AppData>): AppData => ({
  ...DEFAULT_DATA,
  subscription: { ...DEFAULT_DATA.subscription, plan: 'free', status: 'active' },
  finance: [],
  ...over,
});

describe('workspaceOps', () => {
  it('รวม revenue/expense/net + นับงานเสร็จ + ดีลปิด', () => {
    const d = ws({
      finance: [
        { id: 'a', label: 'ขาย', amount: 80000, kind: 'revenue', date: '2026-07-01' },
        { id: 'b', label: 'จ่าย', amount: 30000, kind: 'expense', date: '2026-07-02' },
      ],
      aiCompany: {
        ...DEFAULT_DATA.aiCompany,
        tasks: [
          { ...(DEFAULT_DATA.aiCompany.tasks[0]), id: 't1', status: 'done' },
          { ...(DEFAULT_DATA.aiCompany.tasks[0]), id: 't2', status: 'in_progress' },
        ],
      },
      marketplace: {
        ...DEFAULT_DATA.marketplace,
        deals: [
          { id: 'd1', partnerId: 'p1', title: 'x', amount: 12000, status: 'closed' },
          { id: 'd2', partnerId: 'p2', title: 'y', amount: 9999, status: 'negotiating' },
        ],
      },
    });
    const o = workspaceOps(d);
    expect(o.revenue).toBe(80000);
    expect(o.expense).toBe(30000);
    expect(o.net).toBe(50000);
    expect(o.tasksDone).toBe(1);
    expect(o.dealsClosed).toBe(1);
    expect(o.dealsValue).toBe(12000);
  });
});

describe('opsTotals', () => {
  it('รวมข้ามเวิร์กสเปซ + นับ paying เฉพาะ plan≠free & active', () => {
    const rows = [
      { ...workspaceOps(ws({})), plan: 'growth', subStatus: 'active', revenue: 100, expense: 40, net: 60, dealsClosed: 1, dealsValue: 100, tasksDone: 2, running: true },
      { ...workspaceOps(ws({})), plan: 'free', subStatus: 'active', revenue: 0, expense: 0, net: 0, dealsClosed: 0, dealsValue: 0, tasksDone: 0, running: false },
    ];
    const t = opsTotals(rows);
    expect(t.workspaces).toBe(2);
    expect(t.paying).toBe(1);              // free ไม่นับ
    expect(t.revenue).toBe(100);
    expect(t.net).toBe(60);
    expect(t.activeCompanies).toBe(1);
  });
});

describe('opsCsv / opsTsv — export ปลอดภัย', () => {
  const row: OpsRow = { ...workspaceOps(ws({})), name: 'บริษัท, จำกัด', owner: 'a@b.com', members: 3, created: '2026-07-01' };

  it('CSV มี BOM + escape ค่าที่มี comma ด้วย double-quote', () => {
    const csv = opsCsv([row]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);        // BOM
    expect(csv).toContain('"บริษัท, จำกัด"');       // comma → ครอบ quote
    expect(csv.split('\r\n').length).toBeGreaterThanOrEqual(2); // header + 1 row
  });

  it('TSV คั่นด้วยแท็บ + ไม่มี tab/newline หลุดในค่า', () => {
    const tsv = opsTsv([row]);
    expect(tsv.split('\n')[0]).toContain('\t');
    const dataLine = tsv.split('\n')[1];
    expect(dataLine.split('\t').length).toBe(tsv.split('\n')[0].split('\t').length); // จำนวนคอลัมน์ตรงกัน
  });
});
