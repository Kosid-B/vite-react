import { describe, it, expect } from 'vitest';
import { reviewTasks, nextStepTasks, reportByPosition, boardReportText } from '../boardReport';
import { DEFAULT_DATA } from '../../data';
import type { AppData, AICompany, AgentTask } from '../../types';

/* CEO รายงานบอร์ด — จัดกลุ่มงานรออนุมัติตามตำแหน่ง + สรุปสถานะ */

const task = (over: Partial<AgentTask>): AgentTask =>
  ({ ...(DEFAULT_DATA.aiCompany.tasks[0]), id: 't', title: 'งาน', status: 'done', ...over });

const company = (tasks: AgentTask[], agents = DEFAULT_DATA.aiCompany.agents): AICompany =>
  ({ ...DEFAULT_DATA.aiCompany, tasks, agents });

describe('reviewTasks / nextStepTasks', () => {
  const c = company([
    task({ id: 'a', status: 'review' }),
    task({ id: 'b', status: 'done' }),
    task({ id: 'c', status: 'queued' }),
    task({ id: 'd', status: 'in_progress' }),
  ]);
  it('reviewTasks = เฉพาะ review', () => {
    expect(reviewTasks(c).map(t => t.id)).toEqual(['a']);
  });
  it('nextStepTasks = queued + in_progress', () => {
    expect(nextStepTasks(c).map(t => t.id).sort()).toEqual(['c', 'd']);
  });
});

describe('reportByPosition', () => {
  it('จัดกลุ่มงาน review ตาม agentId', () => {
    const ag = DEFAULT_DATA.aiCompany.agents[0];
    const c = company(
      [task({ id: 'x', status: 'review', agentId: ag.id }), task({ id: 'y', status: 'review', agentId: ag.id })],
      [ag],
    );
    const groups = reportByPosition(c);
    expect(groups).toHaveLength(1);
    expect(groups[0].agentId).toBe(ag.id);
    expect(groups[0].tasks).toHaveLength(2);
  });
});

describe('boardReportText', () => {
  it('มีชื่อบริษัท + หัวข้อการเงิน + จำนวนงานรออนุมัติ', () => {
    const d: AppData = { ...DEFAULT_DATA, aiCompany: company([task({ status: 'review' })], DEFAULT_DATA.aiCompany.agents) };
    const txt = boardReportText(d);
    expect(txt).toContain('รายงานผลการดำเนินงานต่อบอร์ด');
    expect(txt).toContain('สรุปการเงิน');
    expect(txt).toMatch(/ขั้นตอนถัดไป/);
  });
});
