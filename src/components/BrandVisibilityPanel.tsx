import { useEffect, useMemo, useState } from 'react';
import {
  brandHealth, brandMetrics, metricScore, entityConsistency,
  type BrandVisibilityInput, type BrandMetric,
} from '../lib/brandVisibility';
import { entityConfusionLabel } from '../lib/brandVisibility';
import { BRAND_NAME, entityIssues } from '../lib/brandEntity';
import { ringVerdict, RINGS, KEYWORD_LAYERS } from '../lib/searchOwnership';

/* แผง "ตลาดและ Search Engine เริ่มจำแบรนด์เราถูกหรือยัง"
 *
 * 🔴 เหตุผลที่ต้องมี (27 ส.ค. 2569): Google AI Overview ตอบคำค้น `ceoaithailand`
 *    โดยแตกชื่อเป็น "CEO และ AI ในประเทศไทย" แล้วอ้างนิตยสาร/รางวัล/หลักสูตรของคนอื่น
 *    ⇒ ถ้าไม่มีแผงนี้ เราจะรู้เรื่องนี้ก็ต่อเมื่อบังเอิญไปค้นเจอเอง
 *
 * ⚠️ ช่องกรอกทั้งหมด **เก็บในเครื่องนี้เท่านั้น (localStorage)** ไม่ขึ้น DB
 *    เพราะด่านปล่อยของ (`releaseGates`) ยังกั้นการเปลี่ยน schema อยู่
 *    ⇒ ตั้งใจให้เป็นแบบนี้ชั่วคราว · พอด่านเปิด ค่อยย้ายไปตาราง staging
 *
 * 🔴 สิ่งที่แผงนี้ห้ามทำ: เติม 0 แทนช่องที่ยังไม่ได้กรอก เพื่อให้คะแนนออกมาสวย
 *    (ตรรกะอยู่ใน brandVisibility.ts ทั้งหมด — แผงนี้แค่แสดงผล)
 */

const KEY = 'ceoai_brand_visibility';

function readSaved(): BrandVisibilityInput {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as BrandVisibilityInput; }
  catch { return {}; }
}

const FIELDS: { key: keyof BrandVisibilityInput; label: string; step?: string }[] = [
  { key: 'indexedPages', label: 'หน้าที่จัดทำดัชนีแล้ว' },
  { key: 'ownedSerpCoverage', label: 'ส่วนของผลค้นหาที่เป็นของเรา (0–1)', step: '0.1' },
  { key: 'brandedRank', label: 'อันดับเมื่อค้นชื่อแบรนด์' },
  { key: 'externalMentions', label: 'เว็บอื่นที่พูดถึงเรา' },
  { key: 'shareOfSearch', label: 'ส่วนแบ่งการค้นหา (0–1)', step: '0.01' },
  { key: 'brandedImpressions', label: 'ยอดแสดงผลคำค้นแบรนด์' },
  { key: 'facebookFollowers', label: 'ผู้ติดตาม Facebook' },
  { key: 'youtubeSubscribers', label: 'ผู้ติดตาม YouTube' },
];

function pct(m: BrandMetric): string {
  const s = metricScore(m);
  return s === null ? '—' : `${Math.round(s * 100)}%`;
}

export default function BrandVisibilityPanel() {
  const [inp, setInp] = useState<BrandVisibilityInput>({});
  useEffect(() => { setInp(readSaved()); }, []);

  function set(key: keyof BrandVisibilityInput, raw: string) {
    setInp((cur) => {
      const next = { ...cur };
      // 🔴 ช่องว่าง = "ยังไม่ได้ตรวจ" ต้องเป็น undefined ไม่ใช่ 0
      if (raw.trim() === '') delete next[key];
      else next[key] = Number(raw);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* empty */ }
      return next;
    });
  }

  const health = useMemo(() => brandHealth(inp), [inp]);
  const metrics = useMemo(() => brandMetrics(inp), [inp]);
  const ec = entityConsistency();
  const blockers = entityIssues().filter((i) => i.level === 'blocker');
  // 🔗 วงที่เปิดได้ตอนนี้ — categoryArrivals ยัง null โดยตั้งใจ (ต้องใช้ข้อมูล Search Console
  //    ที่ผู้ช่วยอ่านเองไม่ได้) ⇒ ระบบจะไม่เปิดวง 3 ให้ จนกว่าจะมีตัวเลขจริง (fail-closed)
  const ring = useMemo(() => ringVerdict({ ownedSerpCoverage: inp.ownedSerpCoverage ?? null }), [inp]);
  const confusion = entityConfusionLabel(inp);
  const layerLabel = (k: string) => KEYWORD_LAYERS.find((l) => l.key === k)?.label ?? k;

  return (
    <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '16px 18px', background: 'var(--cream2)' }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
        🔎 เครื่องมือค้นหาจำ &quot;{BRAND_NAME}&quot; ถูกตัวหรือยัง
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, marginBottom: 12, lineHeight: 1.7 }}>
        คำถามนี้ต่างจาก &quot;SEO ดีไหม&quot; — SEO ถามว่าเราติดอันดับคำค้นไหม ·
        <b style={{ color: 'var(--ink)' }}>ข้อนี้ถามว่าค้นชื่อเราแล้วเครื่องเข้าใจว่าเราคือใคร</b>
        <br />ช่องกรอกเก็บในเครื่องนี้เท่านั้น (ยังไม่ขึ้นฐานข้อมูล — ด่านปล่อยของยังกั้น schema อยู่)
      </div>

      {/* คะแนนรวม — หรือเหตุผลที่ยังให้คะแนนไม่ได้ */}
      <div style={{
        border: `1px solid ${health.score === null ? '#d97706' : 'var(--sand)'}`,
        borderRadius: 10, padding: '10px 12px', background: 'var(--cream)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
          {health.score === null ? '🟡 ยังให้คะแนนรวมไม่ได้' : `📊 คะแนนการถูกจำถูกตัว ${health.score}/100`}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.65 }}>{health.why}</div>
      </div>

      {/* 🎯 วงที่เปิดได้ตอนนี้ — ยึดพื้นที่ค้นหาทีละวง ห้ามข้ามขั้น */}
      <div style={{
        border: '1px solid var(--sand)', borderRadius: 10, padding: '10px 12px',
        background: 'var(--cream)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>
          🎯 วงที่ {ring.ring} — {RINGS.find((r) => r.n === ring.ring)?.label}
          {ring.blind && <span style={{ color: '#d97706' }}> · 🟡 ยังตรวจไม่ได้ จึงถือว่าอยู่วงแรกไว้ก่อน</span>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.65 }}>{ring.why}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink)', marginTop: 6, lineHeight: 1.65 }}>
          ✅ ทำได้ตอนนี้: {ring.openLayers.map(layerLabel).join(' · ')}
          {ring.lockedLayers.length > 0 && (
            <><br />⏳ ยังไม่ถึงเวลา: {ring.lockedLayers.map(layerLabel).join(' · ')}</>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 6 }}>
          ความสับสนของ entity: <b style={{ color: confusion === 'ตรวจไม่ได้' ? '#d97706' : 'var(--ink)' }}>{confusion}</b>
          {confusion === 'ตรวจไม่ได้' && ' — กรอก "ส่วนของผลค้นหาที่เป็นของเรา" ด้านล่างแล้วค่านี้จะคำนวณเอง'}
        </div>
      </div>

      {/* คอขวด + งานถัดไป — บรรทัดแรกต้องเป็นข้อเสนอ ไม่ใช่ที่มา */}
      <div style={{
        border: '1px solid #7c3aed', borderRadius: 10, padding: '10px 12px',
        background: 'rgba(124,58,237,0.07)', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink)' }}>👉 งานถัดไป</div>
        <div style={{ fontSize: 12, color: 'var(--ink)', marginTop: 4, lineHeight: 1.7 }}>{health.nextAction}</div>
        {health.bottleneck && (
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 5 }}>
            คอขวดปัจจุบัน: <code style={{ fontSize: 11 }}>{health.bottleneck}</code> · ขั้นถัดไปยังไม่ต้องเริ่ม
          </div>
        )}
      </div>

      {/* สัญญาณที่รีโปคุมเองได้ — ตัวเดียวที่ไม่ต้องรอใครกรอก */}
      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 5 }}>
        สัญญาณที่เราคุมเองได้ — {ec.total - ec.missing}/{ec.total} ช่องทาง
      </div>
      {blockers.length > 0 && (
        <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 11.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
          {blockers.map((b, i) => <li key={i}>🔴 {b.what} — <b style={{ color: 'var(--ink)' }}>{b.fix}</b></li>)}
        </ul>
      )}

      {/* ตารางตัวชี้วัด */}
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {metrics.map((m) => (
          <div key={m.key} style={{ display: 'flex', gap: 8, fontSize: 11.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ flex: '1 1 190px', color: 'var(--ink)' }}>{m.label}</span>
            <span style={{ color: m.value === null ? '#d97706' : 'var(--ink)', fontWeight: 700, minWidth: 84, textAlign: 'right' }}>
              {m.value === null ? '🟡 ตรวจไม่ได้' : `${m.value} ${m.unit}`}
            </span>
            <span style={{ color: 'var(--ink3)', minWidth: 52, textAlign: 'right' }}>
              {m.target === null ? 'บริบท' : pct(m)}
            </span>
          </div>
        ))}
      </div>

      {/* ช่องกรอกค่าที่ผู้ช่วยอ่านเองไม่ได้ */}
      <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>
        กรอกค่าที่ต้องเปิดดูเอง (เว้นว่าง = ยังไม่ได้ตรวจ · ห้ามใส่ 0 แทน)
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {FIELDS.map((f) => {
          const m = metrics.find((x) => x.key === f.key);
          return (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, flexWrap: 'wrap' }}>
              <span style={{ flex: '1 1 170px', color: 'var(--ink)' }}>{f.label}</span>
              <input
                type="number" step={f.step} placeholder="—" aria-label={f.label}
                value={inp[f.key] === undefined ? '' : String(inp[f.key])}
                onChange={(e) => set(f.key, e.target.value)}
                style={{
                  width: 92, padding: '4px 7px', fontSize: 12, color: 'var(--ink)',
                  border: '1px solid var(--sand)', borderRadius: 6, background: 'var(--cream)',
                }}
              />
              <span style={{ flex: '2 1 240px', color: 'var(--ink3)', fontSize: 11, lineHeight: 1.55 }}>
                {m?.howToGet}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
