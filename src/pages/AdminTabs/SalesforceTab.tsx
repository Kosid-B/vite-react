import { useState } from 'react';

type SfSyncStatus = 'not_connected' | 'connected' | 'syncing' | 'error';
type SfSyncDirection = 'sf_to_app' | 'app_to_sf' | 'bidirectional';

interface SfObjectMap {
  sfObject: string;
  sfLabel: string;
  appEntity: string;
  appLabel: string;
  direction: SfSyncDirection;
  enabled: boolean;
  fields: { sfField: string; sfLabel: string; appField: string; appLabel: string }[];
}

const SF_OBJECT_MAPS: SfObjectMap[] = [
  {
    sfObject: 'Lead',     sfLabel: 'Lead',
    appEntity: 'personas', appLabel: 'Persona',
    direction: 'sf_to_app', enabled: true,
    fields: [
      { sfField: 'FirstName + LastName', sfLabel: 'ชื่อ-นามสกุล', appField: 'name',  appLabel: 'ชื่อ Persona' },
      { sfField: 'Title',               sfLabel: 'ตำแหน่ง',      appField: 'role',  appLabel: 'บทบาท' },
      { sfField: 'Description',         sfLabel: 'คำอธิบาย',     appField: 'quote', appLabel: 'Quote' },
    ],
  },
  {
    sfObject: 'Opportunity', sfLabel: 'Opportunity',
    appEntity: 'funnel',     appLabel: 'Funnel Stage',
    direction: 'sf_to_app', enabled: true,
    fields: [
      { sfField: 'StageName',    sfLabel: 'Stage',         appField: 'stageId', appLabel: 'Stage ID' },
      { sfField: 'Amount',       sfLabel: 'มูลค่าดีล',     appField: 'leads',   appLabel: 'จำนวน Leads' },
      { sfField: 'Description',  sfLabel: 'คำอธิบาย',     appField: 'note',    appLabel: 'Note' },
    ],
  },
  {
    sfObject: 'Account', sfLabel: 'Account',
    appEntity: 'marketplace', appLabel: 'Partner',
    direction: 'bidirectional', enabled: false,
    fields: [
      { sfField: 'Name',        sfLabel: 'บริษัท',   appField: 'name',     appLabel: 'ชื่อคู่ค้า' },
      { sfField: 'Industry',    sfLabel: 'อุตสาหกรรม', appField: 'category', appLabel: 'หมวดหมู่' },
      { sfField: 'Description', sfLabel: 'รายละเอียด', appField: 'desc',     appLabel: 'คำอธิบาย' },
    ],
  },
  {
    sfObject: 'Task', sfLabel: 'Task (Activity)',
    appEntity: 'actions', appLabel: 'Priority Action',
    direction: 'bidirectional', enabled: false,
    fields: [
      { sfField: 'Subject',     sfLabel: 'หัวข้อ',    appField: 'title', appLabel: 'Title' },
      { sfField: 'Description', sfLabel: 'รายละเอียด', appField: 'desc',  appLabel: 'Description' },
      { sfField: 'Status',      sfLabel: 'สถานะ',     appField: 'done',  appLabel: 'Done?' },
    ],
  },
];

const SF_SYNC_LOGS = [
  { at: '2026-06-27 09:12', object: 'Lead',        dir: 'SF → App', count: 12, status: 'ok'    as const, msg: 'Synced 12 Leads → Personas' },
  { at: '2026-06-26 18:00', object: 'Opportunity', dir: 'SF → App', count: 8,  status: 'ok'    as const, msg: 'Updated 8 Funnel stages from Opportunity pipeline' },
  { at: '2026-06-26 09:00', object: 'Lead',        dir: 'SF → App', count: 0,  status: 'warn'  as const, msg: 'No new Leads since last sync' },
  { at: '2026-06-25 14:30', object: 'Account',     dir: '—',        count: 0,  status: 'error' as const, msg: 'Object disabled — skipped' },
];

const SF_SOQL_EXAMPLES = [
  { label: 'Leads ใหม่ใน 30 วัน',   soql: "SELECT Id, FirstName, LastName, Title, Description FROM Lead WHERE CreatedDate = LAST_N_DAYS:30 ORDER BY CreatedDate DESC LIMIT 200" },
  { label: 'Open Opportunities',     soql: "SELECT Id, Name, StageName, Amount, Description FROM Opportunity WHERE IsClosed = false AND OwnerId IN :teamIds ORDER BY CloseDate ASC LIMIT 200" },
  { label: 'Active Accounts',        soql: "SELECT Id, Name, Industry, Description, Rating FROM Account WHERE Type = 'Partner' AND Rating IN ('Hot','Warm') ORDER BY Name LIMIT 200" },
  { label: 'Open Tasks (Activities)', soql: "SELECT Id, Subject, Status, Description, OwnerId FROM Task WHERE IsClosed = false AND ActivityDate >= TODAY ORDER BY ActivityDate ASC LIMIT 200" },
];

export default function SalesforceTab() {
  const [sfStatus, setSfStatus]           = useState<SfSyncStatus>('not_connected');
  const [sfObjectMaps, setSfObjectMaps]   = useState<SfObjectMap[]>(SF_OBJECT_MAPS);
  const [sfExpandedObj, setSfExpandedObj] = useState<string | null>(null);
  const [sfCronMin, setSfCronMin]         = useState(60);
  const [sfSyncing, setSfSyncing]         = useState(false);

  function triggerSfSync() {
    if (sfStatus !== 'connected') return;
    setSfSyncing(true);
    setTimeout(() => { setSfSyncing(false); }, 2200);
  }

  return (
    <div className="sf-wrap">

      {/* 1. Connection Status */}
      <div className="sf-section">
        <div className="sf-section-title">☁️ Salesforce Connection</div>
        <div className="sf-conn-layout">
          <div className={`sf-conn-status sf-conn-${sfStatus}`}>
            <div className="sf-conn-dot" />
            <div className="sf-conn-text">
              <div className="sf-conn-label">
                {sfStatus === 'not_connected' && 'ยังไม่ได้เชื่อมต่อ'}
                {sfStatus === 'connected'     && '✅ เชื่อมต่อแล้ว'}
                {sfStatus === 'syncing'       && '🔄 กำลัง Sync...'}
                {sfStatus === 'error'         && '❌ เกิดข้อผิดพลาด'}
              </div>
              <div className="sf-conn-sub">
                {sfStatus === 'not_connected' && 'ตั้งค่า OAuth credentials ใน Supabase Edge Function Secrets ก่อน'}
                {sfStatus === 'connected'     && 'Connected · Last sync: 27 มิ.ย. 2026 09:12 น.'}
                {sfStatus === 'syncing'       && 'กำลังดึงข้อมูลจาก Salesforce...'}
                {sfStatus === 'error'         && 'Refresh token expired — กรุณา re-authorize'}
              </div>
            </div>
            <div className="sf-conn-actions">
              {sfStatus === 'not_connected' || sfStatus === 'error' ? (
                <button className="sf-btn sf-btn-primary" onClick={() => setSfStatus('connected')}>
                  🔗 Connect (OAuth 2.0)
                </button>
              ) : (
                <>
                  <button className="sf-btn sf-btn-sync" onClick={triggerSfSync} disabled={sfSyncing}>
                    {sfSyncing ? '⏳ Syncing…' : '🔄 Sync Now'}
                  </button>
                  <button className="sf-btn sf-btn-danger" onClick={() => setSfStatus('not_connected')}>
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="sf-security-note">
            <div className="sf-security-title">🔒 ข้อกำหนดความปลอดภัย</div>
            <ul className="sf-security-list">
              <li><b>SALESFORCE_CLIENT_ID</b> และ <b>SALESFORCE_CLIENT_SECRET</b> ต้องเก็บเป็น Supabase Secret เท่านั้น — ไม่เก็บใน .env หรือ frontend code</li>
              <li>Refresh token จัดการผ่าน <code>supabase/functions/sf-sync/index.ts</code> — browser ไม่เคยเห็น token โดยตรง</li>
              <li>ใช้ Connected App scope: <code>api refresh_token</code> เท่านั้น — ไม่ต้องการ <code>full</code></li>
              <li>Enable "Require Proof Key for Code Exchange (PKCE)" ใน Connected App settings</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Object & Field Mapping */}
      <div className="sf-section">
        <div className="sf-section-title">🗂 Object & Field Mapping</div>
        <div className="sf-hint">กำหนดว่า Salesforce Object ใดจะ map กับข้อมูลใดใน CEO AI Thailand</div>
        <div className="sf-obj-list">
          {sfObjectMaps.map(obj => (
            <div key={obj.sfObject} className={`sf-obj-card ${obj.enabled ? 'sf-obj-enabled' : 'sf-obj-disabled'}`}>
              <div className="sf-obj-head">
                <div className="sf-obj-title">
                  <span className="sf-obj-name">{obj.sfLabel}</span>
                  <span className="sf-obj-arrow">→</span>
                  <span className="sf-obj-app">{obj.appLabel}</span>
                  <span className={`sf-dir-badge sf-dir-${obj.direction}`}>
                    {obj.direction === 'sf_to_app' ? 'SF → App' : obj.direction === 'app_to_sf' ? 'App → SF' : '↔ Bidirectional'}
                  </span>
                </div>
                <div className="sf-obj-controls">
                  <label className="sf-toggle">
                    <input type="checkbox" checked={obj.enabled}
                      onChange={e => setSfObjectMaps(maps => maps.map(m =>
                        m.sfObject === obj.sfObject ? { ...m, enabled: e.target.checked } : m
                      ))} />
                    <span className="sf-toggle-track" />
                  </label>
                  <button className="sf-expand-btn" onClick={() =>
                    setSfExpandedObj(prev => prev === obj.sfObject ? null : obj.sfObject)}>
                    {sfExpandedObj === obj.sfObject ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {sfExpandedObj === obj.sfObject && (
                <div className="sf-field-table-wrap">
                  <table className="sf-field-table">
                    <thead>
                      <tr>
                        <th>SF Field</th>
                        <th>SF Label</th>
                        <th className="sf-arrow-col">→</th>
                        <th>App Field</th>
                        <th>App Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obj.fields.map(f => (
                        <tr key={f.sfField}>
                          <td><code className="sf-code">{f.sfField}</code></td>
                          <td className="sf-td-label">{f.sfLabel}</td>
                          <td className="sf-arrow-col sf-map-arrow">→</td>
                          <td><code className="sf-code">{f.appField}</code></td>
                          <td className="sf-td-label">{f.appLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. SOQL Query Reference */}
      <div className="sf-section">
        <div className="sf-section-title">🔍 SOQL Query Reference</div>
        <div className="sf-hint">Edge Function ใช้ SOQL เหล่านี้ดึงข้อมูล — Selective queries ใช้ indexed fields เพื่อหลีกเลี่ยง governor limit</div>
        <div className="sf-soql-list">
          {SF_SOQL_EXAMPLES.map(q => (
            <div key={q.label} className="sf-soql-item">
              <div className="sf-soql-label">{q.label}</div>
              <pre className="sf-soql-pre"><code>{q.soql}</code></pre>
            </div>
          ))}
        </div>
        <div className="sf-gov-note">
          ⚡ <b>Governor Limits:</b> SOQL ทุก query ใช้ indexed fields (<code>CreatedDate</code>, <code>Id</code>, <code>OwnerId</code>, <code>IsClosed</code>) + <code>LIMIT 200</code>
          เพื่อรองรับ batch ขนาด 200 records ต่อ transaction ตาม Salesforce best practice
        </div>
      </div>

      {/* 4. Sync Schedule */}
      <div className="sf-section">
        <div className="sf-section-title">⏱ Sync Schedule (Supabase Cron)</div>
        <div className="sf-hint">กำหนดความถี่ผ่าน Supabase pg_cron — Edge Function <code>sf-sync</code> จะถูกเรียกตามตาราง</div>
        <div className="sf-cron-layout">
          <div className="sf-cron-inputs">
            <div className="sf-cron-row">
              <label className="sf-cron-label">ทุก</label>
              <input type="number" className="sf-cron-inp" min={5} max={1440} step={5} value={sfCronMin}
                onChange={e => setSfCronMin(Math.max(5, Math.min(1440, +e.target.value)))} />
              <span className="sf-cron-unit">นาที</span>
            </div>
            <div className="sf-cron-expr">
              Cron expression: <code>{sfCronMin < 60 ? `*/${sfCronMin} * * * *` : sfCronMin === 60 ? '0 * * * *' : `0 */${Math.round(sfCronMin/60)} * * *`}</code>
            </div>
          </div>
          <div className="sf-cron-code-wrap">
            <div className="sf-cron-code-label">supabase/functions/sf-sync/index.ts (โครงสร้าง)</div>
            <pre className="sf-code-block"><code>{`import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from '@supabase/supabase-js'

// Credentials อยู่ใน Supabase Secrets — ไม่เคยส่งมา frontend
const SF_CLIENT_ID     = Deno.env.get('SALESFORCE_CLIENT_ID')!
const SF_CLIENT_SECRET = Deno.env.get('SALESFORCE_CLIENT_SECRET')!
const SF_REFRESH_TOKEN = Deno.env.get('SALESFORCE_REFRESH_TOKEN')!
const SF_INSTANCE_URL  = Deno.env.get('SALESFORCE_INSTANCE_URL')!

serve(async (_req) => {
  // 1. Refresh access token
  const tokenRes = await fetch(\`\${SF_INSTANCE_URL}/services/oauth2/token\`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
      refresh_token: SF_REFRESH_TOKEN,
    }),
  })
  const { access_token } = await tokenRes.json()

  // 2. SOQL query — indexed fields, LIMIT 200 (bulkified)
  const query = encodeURIComponent(
    'SELECT Id,FirstName,LastName,Title,Description FROM Lead ' +
    'WHERE CreatedDate = LAST_N_DAYS:1 ORDER BY CreatedDate DESC LIMIT 200'
  )
  const sfRes = await fetch(
    \`\${SF_INSTANCE_URL}/services/data/v59.0/query?q=\${query}\`,
    { headers: { Authorization: \`Bearer \${access_token}\` } }
  )
  const { records } = await sfRes.json()

  // 3. Upsert to Supabase (no DML inside loops — batch insert)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // Edge Function only
  )
  const rows = records.map((r: Record<string, string>) => ({
    sf_id: r.Id,
    name: \`\${r.FirstName} \${r.LastName}\`,
    role: r.Title ?? '',
    quote: r.Description ?? '',
    synced_at: new Date().toISOString(),
  }))
  await supabase.from('sf_leads_cache').upsert(rows, { onConflict: 'sf_id' })

  return new Response(JSON.stringify({ synced: rows.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})`}</code></pre>
          </div>
        </div>
      </div>

      {/* 5. Sync Log */}
      <div className="sf-section">
        <div className="sf-section-title">📋 Sync Log</div>
        <table className="sf-log-table">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>Object</th>
              <th>ทิศทาง</th>
              <th className="sf-num">Records</th>
              <th>สถานะ</th>
              <th>ข้อความ</th>
            </tr>
          </thead>
          <tbody>
            {SF_SYNC_LOGS.map((log, i) => (
              <tr key={i}>
                <td className="sf-log-at">{log.at}</td>
                <td><code className="sf-code">{log.object}</code></td>
                <td className="sf-log-dir">{log.dir}</td>
                <td className="sf-num">{log.count}</td>
                <td>
                  <span className={`sf-log-badge sf-log-${log.status}`}>
                    {log.status === 'ok' ? '✅' : log.status === 'warn' ? '⚠️' : '❌'}
                    {' '}{log.status}
                  </span>
                </td>
                <td className="sf-log-msg">{log.msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
