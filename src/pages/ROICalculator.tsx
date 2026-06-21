import type { AppData, ROIInput } from '../types';

interface Props {
  data: AppData;
  onUpdate: (data: AppData) => void;
}

const INPUT_FIELDS: { label: string; field: keyof Pick<ROIInput, 'avgDealValue' | 'teamHourlyRate' | 'monthlyRevenueTarget'>; unit: string }[] = [
  { label: 'มูลค่า Deal เฉลี่ย', field: 'avgDealValue', unit: 'บาท/โปรเจกต์' },
  { label: 'ค่าแรงทีม (ต่อชั่วโมง)', field: 'teamHourlyRate', unit: 'บาท/ชั่วโมง' },
  { label: 'เป้าหมายรายได้/เดือน', field: 'monthlyRevenueTarget', unit: 'บาท' },
];

export default function ROICalculator({ data, onUpdate }: Props) {
  const { funnel, stages, roi } = data;

  const lastLeads = funnel[funnel.length - 1]?.leads ?? 0;

  function save(next: ROIInput) { onUpdate({ ...data, roi: next }); }
  function setField(field: keyof Pick<ROIInput, 'avgDealValue' | 'teamHourlyRate' | 'monthlyRevenueTarget'>, v: number) {
    save({ ...roi, [field]: isNaN(v) || v < 0 ? 0 : v });
  }
  function setHours(stageId: string, h: number) {
    save({ ...roi, stageCosts: roi.stageCosts.map(sc => sc.stageId === stageId ? { ...sc, hours: isNaN(h) || h < 0 ? 0 : h } : sc) });
  }

  let worstDrop = 0, worstIdx = 0;
  funnel.forEach((f, i) => {
    if (i >= funnel.length - 1) return;
    const d = 1 - ((funnel[i + 1]?.leads ?? 0) / Math.max(f.leads, 1));
    if (d > worstDrop) { worstDrop = d; worstIdx = i; }
  });

  const bottleneckConv = (funnel[worstIdx + 1]?.leads ?? 0) / Math.max(funnel[worstIdx]?.leads ?? 1, 1);
  const monthlyRevenue = lastLeads * roi.avgDealValue;
  const gap = roi.monthlyRevenueTarget - monthlyRevenue;

  const rows = funnel.map((f, i) => {
    const sc = roi.stageCosts.find(c => c.stageId === f.stageId);
    const hours = sc?.hours ?? 0;
    const cost = hours * roi.teamHourlyRate;
    const convRate = i < funnel.length - 1 ? ((funnel[i + 1]?.leads ?? 0) / Math.max(f.leads, 1)) : 1;
    return { stageId: f.stageId, leads: f.leads, stageName: stages[i]?.label ?? `S${i + 1}`, hours, cost, convRate, dropRate: 1 - convRate, isWorst: i === worstIdx && i < funnel.length - 1 };
  });

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const nextLeads = funnel[worstIdx + 1]?.leads ?? 0;
  const ratio = nextLeads > 0 ? lastLeads / nextLeads : 1;

  const scenarios = [10, 20, 30].map(pct => {
    const newConv = Math.min(bottleneckConv * (1 + pct / 100), 1);
    const addAtExit = (newConv - bottleneckConv) * Math.max(funnel[worstIdx]?.leads ?? 0, 0);
    const addFinal = addAtExit * ratio;
    const addRevenue = addFinal * roi.avgDealValue;
    const bCost = rows[worstIdx]?.cost ?? 1;
    return { pct, addFinal: Math.round(addFinal * 10) / 10, addRevenue, roiPct: bCost > 0 ? (addRevenue / bCost) * 100 : 0 };
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ROI / Impact Calculator</div>
        <div className="page-meta">
          <span className="meta-chip">เชื่อมกับ Conversion Funnel</span>
          <span className="meta-chip">บันทึกอัตโนมัติ</span>
        </div>
      </div>

      <div className="roi-inputs">
        {INPUT_FIELDS.map(inp => (
          <div key={inp.field} className="roi-inp-card">
            <div className="roi-inp-label">{inp.label}</div>
            <div className="roi-inp-row">
              <span className="roi-inp-prefix">฿</span>
              <input
                className="roi-inp"
                type="number"
                defaultValue={roi[inp.field]}
                key={`${inp.field}-${roi[inp.field]}`}
                onBlur={e => setField(inp.field, Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="roi-inp-unit">{inp.unit}</div>
          </div>
        ))}
      </div>

      <div className="roi-rev-row">
        <div className="roi-rev-card">
          <div className="roi-rev-label">รายได้ปัจจุบัน (ประเมิน)</div>
          <div className="roi-rev-val">฿{monthlyRevenue.toLocaleString()}</div>
          <div className="roi-rev-sub">{lastLeads} deals × ฿{roi.avgDealValue.toLocaleString()}</div>
        </div>
        <div className={`roi-rev-card ${monthlyRevenue >= roi.monthlyRevenueTarget ? 'roi-rev-good' : 'roi-rev-amber'}`}>
          <div className="roi-rev-label">เทียบกับเป้าหมาย</div>
          <div className="roi-rev-val">{monthlyRevenue >= roi.monthlyRevenueTarget ? `+฿${(monthlyRevenue - roi.monthlyRevenueTarget).toLocaleString()}` : `-฿${Math.abs(gap).toLocaleString()}`}</div>
          <div className="roi-rev-sub">{monthlyRevenue >= roi.monthlyRevenueTarget ? '✓ เกินเป้าหมาย' : `ขาดอีก ฿${Math.abs(gap).toLocaleString()}`}</div>
        </div>
        <div className="roi-rev-card roi-rev-rust">
          <div className="roi-rev-label">Bottleneck — {stages[worstIdx]?.label}</div>
          <div className="roi-rev-val">{Math.round(worstDrop * 100)}%</div>
          <div className="roi-rev-sub">drop-off ที่ขั้นนี้</div>
        </div>
        <div className="roi-rev-card">
          <div className="roi-rev-label">ต้นทุนทีมรวม/เดือน</div>
          <div className="roi-rev-val">฿{totalCost.toLocaleString()}</div>
          <div className="roi-rev-sub">{rows.reduce((s, r) => s + r.hours, 0)} ชม. × ฿{roi.teamHourlyRate.toLocaleString()}</div>
        </div>
      </div>

      <div className="roi-section-hd">ต้นทุนต่อ Stage — แก้ชั่วโมงที่ใช้ได้</div>
      <div className="roi-tbl-wrap">
        <div className="roi-tbl-head">
          <div>Stage</div><div>Leads</div><div>Conversion</div>
          <div>ชม./เดือน</div><div>ต้นทุน (฿)</div><div>Drop-off</div>
        </div>
        {rows.map((row, i) => (
          <div key={row.stageId} className={`roi-tbl-row${row.isWorst ? ' roi-tbl-worst' : ''}`}>
            <div className="roi-tbl-stage">
              <span className="roi-tbl-num">{i + 1}</span>
              {row.stageName}
              {row.isWorst && <span className="roi-tbl-badge">Bottleneck</span>}
            </div>
            <div>{row.leads.toLocaleString()}</div>
            <div>{i < funnel.length - 1 ? `${(row.convRate * 100).toFixed(1)}%` : <span className="roi-tbl-final">✓ Final</span>}</div>
            <div className="roi-h-cell">
              <input
                className="roi-h-inp"
                type="number"
                defaultValue={row.hours}
                key={`h-${row.stageId}`}
                onBlur={e => setHours(row.stageId, Number(e.target.value))}
                min={0}
              />
              <span className="roi-h-unit">ชม.</span>
            </div>
            <div className="roi-tbl-cost">฿{row.cost.toLocaleString()}</div>
            <div>
              {i < funnel.length - 1 ? (
                <span className={`roi-drop${row.dropRate > 0.7 ? ' roi-drop-hi' : row.dropRate > 0.4 ? ' roi-drop-md' : ' roi-drop-lo'}`}>
                  -{Math.round(row.dropRate * 100)}%
                </span>
              ) : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="roi-section-hd" style={{ marginTop: 28 }}>
        Impact Scenarios — ถ้าปรับปรุง Conversion ที่ &ldquo;{stages[worstIdx]?.label}&rdquo;
      </div>
      <div className="roi-scenarios">
        {scenarios.map(sc => (
          <div key={sc.pct} className="roi-sc">
            <div className="roi-sc-head">
              <span className="roi-sc-pct">+{sc.pct}%</span>
              <span className="roi-sc-txt">Conversion ดีขึ้น</span>
            </div>
            <div className="roi-sc-body">
              <div className="roi-sc-row">
                <div className="roi-sc-val">+{sc.addFinal}</div>
                <div className="roi-sc-lbl">deals เพิ่ม/เดือน</div>
              </div>
              <div className="roi-sc-divider" />
              <div className="roi-sc-row">
                <div className="roi-sc-val roi-sc-money">+฿{Math.round(sc.addRevenue).toLocaleString()}</div>
                <div className="roi-sc-lbl">รายได้เพิ่ม/เดือน</div>
              </div>
              <div className="roi-sc-divider" />
              <div className="roi-sc-row">
                <div className="roi-sc-val" style={{ color: '#2d6a4f' }}>{sc.roiPct.toFixed(0)}%</div>
                <div className="roi-sc-lbl">ROI (เทียบต้นทุน Stage)</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="roi-reco">
        <div className="roi-reco-icon">💡</div>
        <div className="roi-reco-body">
          <div className="roi-reco-title">คำแนะนำ</div>
          <p className="roi-reco-text">
            Stage ที่ควรแก้ก่อนคือ <strong>&ldquo;{stages[worstIdx]?.label}&rdquo;</strong> ซึ่งมี drop-off สูงสุด {Math.round(worstDrop * 100)}%
            หากปรับปรุง Conversion +10% จะสร้างรายได้เพิ่ม <strong>฿{Math.round(scenarios[0].addRevenue).toLocaleString()}/เดือน</strong> ดู Opportunities ใน Journey Map Stage นี้เพื่อหา Action ที่ทำได้ทันที
          </p>
        </div>
      </div>
    </div>
  );
}
