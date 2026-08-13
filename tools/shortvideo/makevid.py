# makevid.py — สร้างวิดีโอสั้นจาก "ฉาก" (scene) แบบ data-driven
# ใช้ซ้ำได้ทุกคลิป: กำหนดฉาก → ได้ HTML ที่มีแอนิเมชันตามเวลาจริง
import base64, json, sys
D='node_modules/@fontsource/kanit/files'
FACES=''.join(
  f"@font-face{{font-family:Kanit;font-weight:{w};font-style:normal;"
  f"src:url(data:font/woff2;base64,{base64.b64encode(open(f'{D}/kanit-thai-{w}-normal.woff2','rb').read()).decode()}) format('woff2');}}\n"
  for w in (400,600,700,800))

def esc(s): return s.replace('&','&amp;').replace('<','&lt;')

def build(cfg, out_html):
    DUR = cfg['duration']
    def pct(t): return round(t / DUR * 100, 3)
    css, body = [], []
    for i, sc in enumerate(cfg['scenes']):
        sid = f's{i}'
        a, b = sc['in'], sc['out']
        fade = 0.35
        css.append(
          f"#{sid}{{animation:k{sid} {DUR}s linear forwards}}\n"
          f"@keyframes k{sid}{{0%,{pct(a)}%{{opacity:0}}{pct(a+fade)}%{{opacity:1}}"
          f"{pct(b-fade)}%{{opacity:1}}{pct(b)}%{{opacity:0}}100%{{opacity:0}}}}\n")
        rows = []
        for j, ln in enumerate(sc['lines']):
            cls = ln.get('cls', 'mid')
            style = f"font-size:{ln['size']}px;" if ln.get('size') else ''
            if ln.get('color'): style += f"color:{ln['color']};"
            if ln.get('mt'): style += f"margin-top:{ln['mt']}px;"
            lid = f"{sid}l{j}"
            if ln.get('at') is not None:          # บรรทัดที่โผล่ทีหลัง
                t = ln['at']
                css.append(
                  f"#{lid}{{opacity:0;animation:k{lid} {DUR}s linear forwards}}\n"
                  f"@keyframes k{lid}{{0%,{pct(t)}%{{opacity:0}}{pct(t+0.3)}%{{opacity:1}}100%{{opacity:1}}}}\n")
            rows.append(f'<div id="{lid}" class="{cls}" style="{style}">{esc(ln["t"]).replace(chr(10),"<br>")}</div>')
        body.append(f'<div class="stage" id="{sid}">{"".join(rows)}</div>')

    html = f"""<!doctype html><meta charset="utf-8"><style>{FACES}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1920px;overflow:hidden;background:#050b16;font-family:Kanit,sans-serif;color:#fff;position:relative}}
.glow{{position:absolute;border-radius:50%;filter:blur(140px)}}
.g1{{width:1250px;height:900px;left:-85px;top:-320px;background:{cfg.get('glow','rgba(220,38,38,.18)')}}}
.g2{{width:1300px;height:800px;left:-110px;top:1420px;background:rgba(22,163,74,.15)}}
.vig{{position:absolute;inset:0;box-shadow:inset 0 0 210px 70px rgba(0,0,0,.6)}}
.stage{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:0 74px;opacity:0}}
.big{{font-size:104px;font-weight:800;line-height:1.16;letter-spacing:-2px}}
.mid{{font-size:64px;font-weight:700;line-height:1.32}}
.sub{{font-size:44px;font-weight:400;color:#cbd5e1;line-height:1.55;margin-top:30px}}
.item{{font-size:42px;font-weight:400;color:#94a3b8;line-height:1.5;margin-top:16px;text-align:left;width:100%;max-width:780px}}
.cta{{margin-top:44px;padding:26px 56px;border-radius:999px;background:#fbbf24;color:#04070f;
  font-size:44px;font-weight:700;box-shadow:0 18px 54px rgba(251,191,36,.34)}}
.url{{margin-top:36px;font-size:46px;font-weight:600;color:#7dd3fc}}
.free{{margin-top:20px;font-size:32px;font-weight:600;color:#4ade80}}
{''.join(css)}</style>
<div class="glow g1"></div><div class="glow g2"></div><div class="vig"></div>
{''.join(body)}"""
    open(out_html,'w',encoding='utf-8').write(html)
    return DUR

if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1], encoding='utf-8'))
    print(build(cfg, sys.argv[2]))
