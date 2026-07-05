import type { Dispatch, SetStateAction } from 'react';
import type { AppData } from '../types';
import { cfoKpis, cfoReportText } from '../lib/cfoReport';
import { clvSummary } from '../lib/clv';
import { insightHeadline } from '../lib/marketInsightTH';
import { salesPipeline, salesPlanText, SALES_TEAM } from '../lib/salesTeam';
import FinanceInput from './FinanceInput';

/* ===== รายงาน C-Suite ต่อ CEO (CFO การเงิน + CMO ตลาด/กลุ่มลูกค้า/ทีมขาย) =====
 * แยกออกจาก AICompany.tsx (ลดขนาด god component) — logic/agent-run ยังอยู่ที่ AICompany
 * แล้วส่ง state + handler เข้ามาเป็น props · helper และ FinanceInput import เองในนี้ */

export interface CSuiteReportsProps {
  data: AppData;
  onUpdate: (d: AppData) => void;
  isSupabaseEnabled: boolean;
  csuiteMsg: string | null;
  setCsuiteMsg: Dispatch<SetStateAction<string | null>>;
  cfoShown: boolean;
  setCfoShown: Dispatch<SetStateAction<boolean>>;
  cfoSubmitToCeo: () => void;
  cmoRunning: boolean;
  runCmoSegmentation: (auto?: boolean) => void;
  cmoInsightRunning: boolean;
  runCmoInsight: () => void;
  cmoSalesRunning: boolean;
  buildSalesTeam: () => void;
  runSalesTeam: () => void;
}

export default function CSuiteReports({
  data, onUpdate, isSupabaseEnabled,
  csuiteMsg, setCsuiteMsg,
  cfoShown, setCfoShown, cfoSubmitToCeo,
  cmoRunning, runCmoSegmentation,
  cmoInsightRunning, runCmoInsight,
  cmoSalesRunning, buildSalesTeam, runSalesTeam,
}: CSuiteReportsProps) {
  const c = data.aiCompany;
  return (
    <section className="ai-panel csuite" style={{ marginTop: 16 }}>
      <div className="ai-panel-hd">🏛️ รายงาน C-Suite ต่อ CEO</div>
      {csuiteMsg && <div className="cs-msg">{csuiteMsg}</div>}
      <div className="cs-grid">
        {/* CFO */}
        <div className="cs-card">
          <div className="cs-role">💰 CFO — การเงิน</div>
          <div className="cs-kpis">
            {cfoKpis(data).slice(0, 6).map((k, i) => (
              <div key={i} className="cs-kpi"><span className="cs-kpi-l">{k.label}</span><span className="cs-kpi-v">{k.status} {k.value}</span></div>
            ))}
          </div>
          <div className="cs-actions">
            <button className="cs-btn" onClick={cfoSubmitToCeo}>เสนอ CEO พร้อมบทวิเคราะห์</button>
            <button className="cs-btn ghost" onClick={() => setCfoShown(v => !v)}>{cfoShown ? 'ซ่อนรายงาน' : 'ดูรายงานเต็ม'}</button>
            <button className="cs-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(cfoReportText(data)); setCsuiteMsg('📋 คัดลอกรายงาน CFO แล้ว'); } catch { setCsuiteMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอก</button>
          </div>
          {cfoShown && <pre className="cs-report">{cfoReportText(data)}</pre>}
          <div className="cs-fin-hd">🔐 นำเข้าข้อมูลการเงิน (ความลับของคุณ)</div>
          <FinanceInput data={data} onUpdate={onUpdate} />
        </div>
        {/* CMO */}
        <div className="cs-card">
          <div className="cs-role">📣 CMO — ตลาด & กลุ่มลูกค้า <span className="cs-badge">อัตโนมัติทุกศุกร์</span></div>
          <div className="cs-sub">CMO ดึงข้อมูลตลาดจริงทุกวันศุกร์ → แบ่งกลุ่มลูกค้า (RFM/พฤติกรรม/ความต้องการ) + CLV + Win Story + กลยุทธ์ต่อกลุ่ม</div>
          {(() => {
            const clv = clvSummary(data);
            return clv.hasData ? (
              <div className="cs-clv">
                <span>💎 CLV ~<b>฿{clv.clvMargin.toLocaleString('th-TH')}</b>/ลูกค้า</span>
                <span>AOV ฿{clv.aov.toLocaleString('th-TH')} × {clv.freqPerYear}/ปี × {clv.lifespanYears} ปี</span>
                <span>CAC คุ้มสูงสุด ฿{clv.maxCac.toLocaleString('th-TH')} (LTV:CAC 3:1)</span>
              </div>
            ) : <div className="cs-clv soon">💎 CLV: ปิดดีลแรก/กรอกการเงินเพื่อคำนวณ</div>;
          })()}
          {isSupabaseEnabled ? (
            <div className="cs-actions">
              <button className="cs-btn" onClick={() => runCmoSegmentation(false)} disabled={cmoRunning}>
                {cmoRunning ? 'CMO กำลังวิเคราะห์…' : 'ให้ CMO วิเคราะห์ตอนนี้'}
              </button>
            </div>
          ) : <div className="cs-empty">เปิด Supabase เพื่อให้ CMO ดึงข้อมูลตลาดจริง</div>}
          {data.cmoMarket?.analysis
            ? <>
                <div className="cs-meta">อัปเดต {data.cmoMarket.updatedAt} · {data.cmoMarket.weekTag}{data.cmoMarket.webUsed ? ' · 🌐 ข้อมูลตลาดจริง' : ''}</div>
                <pre className="cs-report">{data.cmoMarket.analysis}</pre>
              </>
            : <div className="cs-empty">ยังไม่มีผลวิเคราะห์ — กดปุ่มด้านบน หรือรอรอบวันศุกร์</div>}

          {/* CMO หาข้อมูลตลาดไทย → เสนอ CEO → บอร์ด */}
          <div className="cs-insight-hd">🇹🇭 ข้อมูลตลาดไทย → เสนอ CEO พิจารณาเสนอบอร์ด</div>
          <div className="cs-sub">อ้างอิงทะเบียนราษฎร์ ธ.ค. 2568 (ประชากร/Gen/จังหวัดกำลังซื้อ/expat) + ค้นตลาดจริง → กลยุทธ์เชิงพื้นที่รายเจน</div>
          <div className="cs-clv"><span>📊 {insightHeadline()}</span></div>
          {isSupabaseEnabled ? (
            <div className="cs-actions">
              <button className="cs-btn" onClick={runCmoInsight} disabled={cmoInsightRunning}>
                {cmoInsightRunning ? 'CMO กำลังหาข้อมูล…' : 'ให้ CMO หาข้อมูลตลาดไทยตอนนี้'}
              </button>
            </div>
          ) : <div className="cs-empty">เปิด Supabase เพื่อให้ CMO ดึงข้อมูลตลาดจริง</div>}
          {data.cmoInsight?.analysis
            ? <>
                <div className="cs-meta">อัปเดต {data.cmoInsight.updatedAt} · {data.cmoInsight.weekTag}{data.cmoInsight.webUsed ? ' · 🌐 ข้อมูลตลาดจริง' : ''}</div>
                <pre className="cs-report">{data.cmoInsight.analysis}</pre>
              </>
            : <div className="cs-empty">ยังไม่มีรายงาน — กดปุ่มด้านบนให้ CMO หาข้อมูลตลาดไทยเสนอ CEO</div>}

          {/* CMO สร้างทีมขาย (Sales Team) → เดินงานบน pipeline จริง */}
          <div className="cs-insight-hd">🧑‍💼 ทีมขาย (Sales Team) — CMO ตั้ง + เดินงาน</div>
          <div className="cs-sub">CMO ตั้งทีมขาย (Sales Manager · SDR · AE · Sales Ops) เสนอผ่าน CEO → บอร์ด แล้วเดินงานบน Pipeline จริงจากดีลในตลาด</div>
          {(() => {
            const p = salesPipeline(data);
            const hasTeam = SALES_TEAM.some(r => c.agents.some(a => a.role.toLowerCase() === r.role.toLowerCase()));
            return <>
              <div className="cs-pipe">
                {p.stages.map(s => (
                  <div key={s.key} className={`cs-pipe-col st-${s.key}`}>
                    <div className="cs-pipe-top">{s.icon} {s.label}</div>
                    <div className="cs-pipe-n">{s.count}</div>
                    <div className="cs-pipe-v">฿{s.value.toLocaleString('th-TH')}</div>
                  </div>
                ))}
              </div>
              <div className="cs-pipe-sum">Conversion <b>{p.convRate}%</b> · ปิดได้ <b>฿{p.wonValue.toLocaleString('th-TH')}</b> · Forecast ถ่วงน้ำหนัก <b>฿{p.forecast.toLocaleString('th-TH')}</b></div>
              <div className="cs-actions">
                <button className="cs-btn" onClick={buildSalesTeam}>{hasTeam ? 'ทีมขายพร้อมแล้ว · เพิ่มตำแหน่งที่ขาด' : 'CMO สร้างทีมขาย → เสนอบอร์ด'}</button>
                {isSupabaseEnabled && (
                  <button className="cs-btn ghost" onClick={runSalesTeam} disabled={cmoSalesRunning}>
                    {cmoSalesRunning ? 'ทีมขายกำลังทำแผน…' : 'ให้ทีมขายดำเนินงานตอนนี้'}
                  </button>
                )}
                <button className="cs-btn ghost" onClick={async () => { try { await navigator.clipboard.writeText(salesPlanText(data)); setCsuiteMsg('📋 คัดลอกแผนทีมขายแล้ว'); } catch { setCsuiteMsg('คัดลอกไม่สำเร็จ'); } }}>คัดลอกแผน</button>
              </div>
            </>;
          })()}
          {data.cmoSales?.plan
            ? <>
                <div className="cs-meta">อัปเดต {data.cmoSales.updatedAt}</div>
                <pre className="cs-report">{data.cmoSales.plan}</pre>
              </>
            : <div className="cs-empty">ยังไม่มีแผนดำเนินงาน — ตั้งทีมขายแล้วกด "ให้ทีมขายดำเนินงาน"</div>}
        </div>
      </div>
    </section>
  );
}
