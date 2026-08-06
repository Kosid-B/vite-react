// Supabase Edge Function: market-snapshot
// Demand/Supply Board (first-party จริง) — รวม RFQ (demand) vs storefronts (supply) ต่อ offerKind
// เขียนลง market_snapshot ของเดือนปัจจุบัน · รันวันที่ 1 ด้วย pg_cron (migration 0048)
// ตรรกะ offerKind mirror src/lib/b2bMatching.ts (source of truth)
//
// Deploy:  supabase functions deploy market-snapshot --no-verify-jwt
// Secret:  CRON_SECRET (เดิม)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// ── offerKind mirror (src/lib/b2bMatching.ts) ──
type OfferKind = "food"|"retail"|"material"|"logistics"|"marketing"|"accounting"|"legal"|"it"|"packaging"|"design"|"other";
const KIND_KEYWORDS: [OfferKind, string[]][] = [
  ["logistics",  ["ขนส่ง","โลจิสติกส์","เดลิเวอรี","ส่งของ","freight"]],
  ["accounting", ["บัญชี","ภาษี","accounting"]],
  ["legal",      ["กฎหมาย","ทนาย","legal"]],
  ["marketing",  ["การตลาด","โฆษณา","ยิงแอด","คอนเทนต์","marketing","เอเจนซี"]],
  ["it",         ["ไอที","ซอฟต์แวร์","เว็บ","ระบบ","it","software","แอป"]],
  ["design",     ["ดีไซน์","ออกแบบ","กราฟิก","design"]],
  ["packaging",  ["บรรจุภัณฑ์","แพ็กเกจ","กล่อง","ถุง","packaging"]],
  ["material",   ["วัตถุดิบ","ส่วนผสม","ผ้า","ไม้","เหล็ก","อะไหล่","ค้าส่ง","ซัพพลาย","material"]],
  ["food",       ["อาหาร","ร้านอาหาร","ก๋วยเตี๋ยว","กาแฟ","เครื่องดื่ม","คาเฟ่","ขนม","เบเกอรี"]],
  ["retail",     ["ร้านค้า","ขายปลีก","ค้าปลีก","เสื้อผ้า","shop","store","retail"]],
];
const KIND_LABEL: Record<OfferKind, string> = {
  food:"ร้านอาหาร/เครื่องดื่ม", retail:"ค้าปลีก", material:"วัตถุดิบ/ค้าส่ง", logistics:"ขนส่ง/โลจิสติกส์",
  marketing:"การตลาด", accounting:"บัญชี/ภาษี", legal:"กฎหมาย", it:"ไอที/ซอฟต์แวร์",
  packaging:"บรรจุภัณฑ์", design:"ออกแบบ", other:"ธุรกิจทั่วไป",
};
function offerKind(category: string): OfferKind {
  const c = (category ?? "").toLowerCase();
  for (const [kind, kws] of KIND_KEYWORDS) if (kws.some(k => c.includes(k.toLowerCase()))) return kind;
  return "other";
}

Deno.serve(async (req) => {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret") ?? "";
  if (CRON_SECRET && secret !== CRON_SECRET) return new Response("forbidden", { status: 403 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  // demand = RFQ (sector + title)
  const { data: rfqs, error: e1 } = await admin.from("rfqs").select("sector, title").limit(5000);
  if (e1) return json({ error: "rfqs:" + e1.message }, 500);
  // supply = หน้าร้านที่เผยแพร่ (dbd + name + description)
  const { data: sfs, error: e2 } = await admin.from("storefronts").select("dbd, name, description").eq("published", true).limit(5000);
  if (e2) return json({ error: "storefronts:" + e2.message }, 500);

  const demand = new Map<OfferKind, number>();
  const supply = new Map<OfferKind, number>();
  for (const r of rfqs ?? []) {
    const k = offerKind(`${r.sector ?? ""} ${r.title ?? ""}`);
    demand.set(k, (demand.get(k) ?? 0) + 1);
  }
  for (const s of sfs ?? []) {
    const k = offerKind(`${s.dbd ?? ""} ${s.name ?? ""} ${s.description ?? ""}`);
    supply.set(k, (supply.get(k) ?? 0) + 1);
  }

  const kinds = new Set<OfferKind>([...demand.keys(), ...supply.keys()]);
  const rows = [...kinds].map(kind => ({
    month, kind, label: KIND_LABEL[kind],
    demand: demand.get(kind) ?? 0, supply: supply.get(kind) ?? 0,
    snapshot_at: new Date().toISOString(),
  }));

  if (rows.length) {
    const { error: e3 } = await admin.from("market_snapshot").upsert(rows, { onConflict: "month,kind" });
    if (e3) return json({ error: "upsert:" + e3.message }, 500);
  }

  return json({ ok: true, month, kinds: rows.length, rfqs: rfqs?.length ?? 0, storefronts: sfs?.length ?? 0 }, 200);
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
