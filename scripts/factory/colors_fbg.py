"""Paint colors named on a fleet buyer's guide's EXTERIOR PAINT COLORS swatch strip (page with that heading).
Each swatch is a filled rectangle; the color name is printed inside it. Usage: python3 -I colors.py <pdf>"""
import json, re, sys
import pdfplumber

def colors(path):
    pdf = pdfplumber.open(path)
    for pg in pdf.pages:
        words = pg.extract_words(x_tolerance=1.5)
        head = [w for w in words if w['text'] == 'PAINT' and any(x['text'] == 'COLORS' and abs(x['top'] - w['top']) < 2 for x in words)]
        if not head:
            continue
        h = head[0]
        sw = [r for r in list(pg.rects) + list(pg.images) if 40 < r['width'] < 160 and 40 < r['height'] < 160 and r['top'] > h['bottom'] and r['top'] < h['bottom'] + 60]
        sw = [r for i, r in enumerate(sw) if not any(abs(o['x0'] - r['x0']) < 5 and abs(o['top'] - r['top']) < 5 for o in sw[:i])]
        out = []
        for r in sorted(sw, key=lambda r: (round(r['top'] / 20), r['x0'])):
            ws = [w for w in words if r['x0'] - 1 <= w['x0'] and w['x1'] <= r['x1'] + 1 and r['top'] - 1 <= w['top'] and w['bottom'] <= r['bottom'] + 1]
            name = re.sub(r'\s+', ' ', ' '.join(w['text'] for w in sorted(ws, key=lambda w: (round(w['top']), w['x0'])))).strip()
            if name and name not in out:
                out.append(name)
        if out:
            return out
    return []

if __name__ == '__main__':
    print(json.dumps(colors(sys.argv[1])))
