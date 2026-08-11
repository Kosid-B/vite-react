// Supabase Edge Function: hubspot-sync
// เชื่อม platform_leads → HubSpot CRM (contacts) เพื่อ "ไม่ทิ้ง lead + ตามต่อด้วย marketing automation"
// (Dark AI Marketing #3 first-party data · #21/#22 retention/LTV) — token อยู่ฝั่ง server เท่านั้น
//
// Deploy:  supabase functions deploy hubspot-sync --no-verify-jwt
// Secret:  supabase secrets set HUBSPOT_TOKEN=pat-xxxxxxxx   (Private App token · scope crm.objects.contacts.write)
//          supabase secrets set CRON_SECRET=...              (กันเรียกจากภายนอก — ใช้ค่าเดียวกับ billing-cron/lead-nurture)
// Schedule (pg_cron ราย ชม./วัน):  select cron.schedule('hubspot-sync','0 * * * *', $$ ... invoke ... $$);
// ไม่มี HUBSPOT_TOKEN = no-op (คืน {skipped:'no token'}) → ปลอดภัยแม้ deploy ก่อนตั้งค่า

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const HUBSPOT_TOKEN = Deno.env.get("HUBSPOT_TOKEN") ?? "";
const LOOKBACK_HOURS = 48; // ซิงก์ lead ใหม่ย้อนหลัง 48 ชม. (upsert by email = idempotent ซ้ำได้ไม่เสียหาย)

const isEmail = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((c || "").trim());

// map lead → HubSpot contact properties (email เป็น key) — เก็บที่มาแคมเปญไว้ทำ segment/automation
function toContact(lead: Record<string, unknown>) {
  const email = String(lead.contact ?? "").trim().toLowerCase();
  const name = String(lead.name ?? "").trim();
  const [firstname, ...rest] = name.split(/\s+/);
  return {
    idProperty: "email",
    id: email,
    properties: {
      // standard properties เท่านั้น = ทำงานได้ทันทีไม่ต้องตั้งค่าเพิ่ม
      email,
      firstname: firstname || "",
      lastname: rest.join(" "),
      hs_lead_status: "NEW",
      lifecyclestage: "lead",
      // อยากเก็บที่มาแคมเปญ (seg/utm) เพื่อทำ segment/automation → สร้าง custom contact properties
      // ใน HubSpot (Settings → Properties) ชื่อ ceo_ai_seg / ceo_ai_utm_* ก่อน แล้ว uncomment:
      // ceo_ai_seg: String(lead.seg ?? ""),
      // ceo_ai_interest: String(lead.interest ?? ""),
      // ceo_ai_utm_source: String(lead.source ?? ""),
      // ceo_ai_utm_medium: String(lead.medium ?? ""),
      // ceo_ai_utm_campaign: String(lead.campaign ?? ""),
    },
  };
}

Deno.serve(async (req) => {
  // กันเรียกจากภายนอก (เหมือน lead-nurture/billing-cron)
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    const url = new URL(req.url);
    if (auth !== `Bearer ${CRON_SECRET}` && url.searchParams.get("secret") !== CRON_SECRET) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  if (!HUBSPOT_TOKEN) {
    return Response.json({ skipped: "no HUBSPOT_TOKEN — ตั้ง secret ก่อนใช้งาน" });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
  const { data: leads, error } = await sb
    .from("platform_leads")
    .select("contact,name,interest,source,medium,campaign,seg,consent,created_at")
    .eq("consent", true)
    .gte("created_at", since)
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // เฉพาะที่เป็นอีเมล (HubSpot contact key = email) — เบอร์โทรข้าม
  const inputs = (leads ?? []).filter((l) => isEmail(String(l.contact ?? ""))).map(toContact);
  if (inputs.length === 0) return Response.json({ synced: 0, note: "ไม่มี lead อีเมลใหม่ในช่วงนี้" });

  // batch upsert (สูงสุด 100/คำขอ)
  let synced = 0;
  const errors: string[] = [];
  for (let i = 0; i < inputs.length; i += 100) {
    const batch = inputs.slice(i, i + 100);
    const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
      method: "POST",
      headers: { "Authorization": `Bearer ${HUBSPOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: batch }),
    }).catch((e) => { errors.push(String(e)); return null; });
    if (r?.ok) synced += batch.length;
    else if (r) errors.push(`HubSpot ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }

  return Response.json({ synced, total: inputs.length, errors: errors.length ? errors : undefined });
});
