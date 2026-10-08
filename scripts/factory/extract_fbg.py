"""Reads a Stellantis fleet buyer's guide PDF and returns its standard-features-and-options matrix.

Each landscape page holds one or two matrix halves, each headed by a "CPOS" row of order codes (one per trim column).
Trim names sit above the codes as rotated text. Feature rows are text lines left of the columns: a new row starts at the
left margin or with an em dash (a sub-item of the last parent line); anything else continues the row above. Marks
(• standard, O/0 optional, P package, F fleet only, combinations) are assigned to the row whose lines contain them.
Usage: python3 -I extract.py <pdf> <out.json>
"""
import json, re, sys
import pdfplumber

MARK = re.compile(r'^(?:•|O|0|P|F|S|[•O0PF]/[•O0PF](?:/[•O0PF])?|N/A|NA|—|–|-)$')
DASH = re.compile(r'^[—–]\s*')


def norm_mark(m):
    return m.replace('0', 'O')


def header_name(items, col, lo, hi, top, bottom):
    near = [i for i in items if abs((i['x0'] + i.get('x1', i['x0'])) / 2 - col['x']) < 10 and i['bottom'] - i['top'] > 9 and lo <= i['x0'] < hi and top < i['top'] < bottom]
    if not near:
        return ''
    groups = {}
    for i in near:
        groups.setdefault(round(i['x0'] / 3), []).append(i)
    parts = []
    for k in sorted(groups):
        g = sorted(groups[k], key=lambda i: -i['top'])  # rotated text reads bottom to top
        parts.append(' '.join(i['text'][::-1] for i in g))
    return ' '.join(parts).replace('®', '').replace('  ', ' ').strip()


def extract(path):
    pdf = pdfplumber.open(path)
    out = []
    for n, pg in enumerate(pdf.pages, 1):
        words = pg.extract_words(keep_blank_chars=False, x_tolerance=1.5)
        items = [{'x0': w['x0'], 'x1': w['x1'], 'top': w['top'], 'bottom': w['bottom'], 'text': w['text']} for w in words]
        cposes = sorted([i for i in items if i['text'] == 'CPOS'], key=lambda i: i['x0'])
        if not cposes:
            continue
        halves = []
        for ci, cp in enumerate(cposes):
            lo = cp['x0'] - 2
            hi = cposes[ci + 1]['x0'] - 2 if ci + 1 < len(cposes) else pg.width
            inside = [i for i in items if lo <= i['x0'] < hi]
            raw = sorted([i for i in inside if abs(i['top'] - cp['top']) < 7 and i['x0'] > cp['x0'] + 120
                          and re.match(r'^[A-Z0-9/]{1,12}$', i['text'])], key=lambda i: i['x0'])
            codes = []
            for r in raw:  # a code can wrap onto two lines ("2TB/2TS/" over "2TW")
                c = (r['x0'] + r['x1']) / 2
                g = next((g for g in codes if abs(g['c'] - c) < 12), None)
                if g:
                    g['parts'].append(r)
                else:
                    codes.append({'c': c, 'parts': [r]})
            if not codes:
                continue
            cols = []
            for g in codes:
                g['parts'].sort(key=lambda i: i['top'])
                xs = min(p['x0'] for p in g['parts'])
                code = ''.join(p['text'] for p in g['parts'])
                # Two columns can share an order code (a gas and a hybrid Pinnacle): number the repeat.
                seen = [c['code'].split('#')[0] for c in cols].count(code)
                if seen:
                    code += '#' + str(seen + 1)
                cols.append({'xs': xs, 'c': g['c'], 'code': code,
                             'name': header_name(inside, {'x': g['c']}, lo, hi, cp['top'] - 120, cp['top'] - 8)})
            left = min(c['xs'] for c in cols) - 10
            body = [i for i in inside if i['top'] > cp['top'] + 4]
            marks = [i for i in body if i['x0'] >= left and MARK.match(i['text'])]
            text = sorted([i for i in body if i['x0'] < left], key=lambda i: (round(i['top']), i['x0']))
            lines = []
            for w in text:
                for l in lines:
                    if abs(l['top'] - w['top']) < 3:
                        l['parts'].append(w)
                        break
                else:
                    lines.append({'top': w['top'], 'parts': [w]})
            for l in lines:
                l['parts'].sort(key=lambda w: w['x0'])
                l['x'] = l['parts'][0]['x0']
                l['bottom'] = max(p['bottom'] for p in l['parts'])
                l['text'] = re.sub(r'\s+', ' ', ' '.join(p['text'] for p in l['parts'])).strip()
            lines.sort(key=lambda l: l['top'])
            rows, section, parent, cur = [], '', '', None
            for l in lines:
                t = l['text']
                at_margin = l['x'] < cp['x0'] + 4
                caps = re.sub(r'\(CONTINUED\)', '', t, flags=re.I).strip()
                if at_margin and len(caps) >= 5 and caps == caps.upper() and re.search(r'[A-Z]{3}', caps) \
                        and not re.search(r'\([A-Z0-9]{3}\)$', caps) and not DASH.match(t):
                    section, parent, cur = caps.title() if False else caps, '', None
                    continue
                if at_margin and not DASH.match(t):
                    # "Bumpers — Front and Rear, Black": a parent item with its first sub-item on the same line.
                    m = re.match(r'^(.*?)\s+[—–]\s+(.*)$', t)
                    if m:
                        parent = m.group(1)
                        cur = {'section': section, 'parent': parent, 'text': m.group(2), 'top': l['top'], 'bottom': l['bottom'], 'marks': {}}
                    else:
                        parent = ''
                        cur = {'section': section, 'parent': '', 'text': t, 'top': l['top'], 'bottom': l['bottom'], 'marks': {}}
                    rows.append(cur)
                elif DASH.match(t):
                    cur = {'section': section, 'parent': parent, 'text': DASH.sub('', t), 'top': l['top'], 'bottom': l['bottom'], 'marks': {}}
                    rows.append(cur)
                elif cur:
                    cur['text'] += ' ' + t
                    cur['bottom'] = l['bottom']
                else:
                    cur = {'section': section, 'parent': '', 'text': t, 'top': l['top'], 'bottom': l['bottom'], 'marks': {}}
                    rows.append(cur)
            for m in marks:
                mc = (m['x0'] + m['x1']) / 2
                col = min(cols, key=lambda c: abs(c['c'] - mc))
                if abs(col['c'] - mc) > 11:
                    continue
                mid = (m['top'] + m['bottom']) / 2
                inrange = [r for r in rows if r['top'] - 4 <= mid <= r['bottom'] + 4]
                pool = inrange or rows
                if not pool:
                    continue
                row = min(pool, key=lambda r: abs((r['top'] + r['bottom']) / 2 - mid))
                if not inrange and abs((row['top'] + row['bottom']) / 2 - mid) > 10:
                    continue
                row['marks'][col['code']] = norm_mark(m['text'])
            halves.append({'cols': [{'code': c['code'], 'name': c['name']} for c in cols],
                           'rows': [{'section': r['section'], 'parent': r['parent'], 'text': r['text'], 'marks': r['marks']} for r in rows]})
        out.append({'page': n, 'halves': halves})
    return out


def normalize(path):
    """One flat table: column codes with their most common printed name, the paint colors, and every row."""
    import collections, importlib.util, os
    pages = extract(path)
    names = collections.defaultdict(collections.Counter)
    rows = []
    for p in pages:
        for h in p['halves']:
            for c in h['cols']:
                names[c['code']][c['name']] += 1
            for r in h['rows']:
                if r['text'].startswith('•') or 'Available with Package noted' in r['text']:
                    continue
                rows.append({'page': p['page'], 'section': re.sub(r'\s*\(CONTINUED\)', '', r['section'], flags=re.I).strip(),
                             'parent': re.sub(r'\s*\(continued\)', '', r['parent'], flags=re.I).strip(), 'text': r['text'], 'marks': r['marks']})
    spec = importlib.util.spec_from_file_location('colors_fbg', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'colors_fbg.py'))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    first = pdfplumber.open(path).pages[0].extract_text() or ''
    title = next((l.strip() for l in first.split('\n') if re.match(r'^20\d\d ', l.strip())), '')
    return {'kind': 'fbg', 'title': title.replace('®', '').strip(),
            'columns': [{'code': k, 'name': v.most_common(1)[0][0]} for k, v in names.items()],
            'colors': mod.colors(path), 'rows': rows}


if __name__ == '__main__':
    d = normalize(sys.argv[1])
    json.dump(d, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    print(sys.argv[1].split('/')[-1], '|', d['title'], '| rows', len(d['rows']), '| cols', [c['code'] for c in d['columns']], '| colors', len(d['colors']))
