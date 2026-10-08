"""Reads a Stellantis media "Feature Availability" PDF (S = Standard, O = Optional, P = Part of package,
NA = Not available, F = Fleet only) into rows of marks per trim column.

The document is a ruled table. Thin horizontal rules in the left column separate rows; thin cell rules in the
trim columns (drawn at each row boundary) give that row's column ranges. A band whose column cells hold words that
are not marks is a header (trim names, sometimes printed rotated one letter at a time); a band with feature text
and no marks is a sub-heading (parent of the indented rows under it).
Usage: python3 -I fa_extract.py <pdf> <out.json>
"""
import collections, json, re, sys
import pdfplumber

MARK = re.compile(r'^(?:S|O|P|F|NA|N/A|[SOPF](?:/[SOPF]|/NA)+|NA/[SOPF]|S\*|O\*|P\*|—|–)$')


def cluster(vals, tol):
    out = []
    for v in sorted(vals):
        if out and v - out[-1][-1] <= tol:
            out[-1].append(v)
        else:
            out.append([v])
    return [sum(c) / len(c) for c in out]


def tidy(t):
    w = t.split()
    w = [x for i, x in enumerate(w) if i == 0 or x != w[i - 1]]
    h = len(w) // 2
    if len(w) % 2 == 0 and w[:h] == w[h:]:
        w = w[:h]
    return ' '.join(w)


def header_text(ws):
    """Join header words; rotated headers come one letter per word, read bottom to top in sub-columns."""
    if not ws:
        return ''
    if len(ws) >= 3 and sum(1 for w in ws if len(w['text']) <= 2) >= len(ws) * 0.7:
        xs = cluster([w['x0'] for w in ws], 1.5)
        subs = collections.defaultdict(list)
        for w in ws:
            subs[min(range(len(xs)), key=lambda i: abs(xs[i] - w['x0']))].append(w)
        return ' '.join(''.join(w['text'] for w in sorted(subs[i], key=lambda w: -w['top'])) for i in sorted(subs))
    ws = sorted(ws, key=lambda w: (round(w['top']), w['x0']))
    return re.sub(r'\s+', ' ', ' '.join(w['text'] for w in ws)).strip()


def extract(path):
    pdf = pdfplumber.open(path)
    title = re.sub(r'\s+', ' ', ' '.join((pdf.pages[0].extract_text() or '').split('\n')[0:2]).replace('®', '')).strip()
    rows, section, parent, parent_x, names, hdr_words = [], '', '', 0, None, []
    for pn, pg in enumerate(pdf.pages, 1):
        words = pg.extract_words(extra_attrs=['fontname', 'size'], x_tolerance=1.2)
        words = [w for w in words if w['top'] < pg.height - 45 and w['text'] not in ('®', '™')]
        cells = [r for r in pg.rects if r['height'] < 1.6 and 15 < r['width'] < 260 and r['x0'] > 150]
        if not cells:
            continue
        by_top = collections.defaultdict(list)
        for r in cells:
            by_top[round(r['top'] / 2)].append(r)

        def cols_at(y):
            k = min(by_top, key=lambda t: abs(t * 2 - y))
            if abs(k * 2 - y) > 4:
                return None
            out = []
            for r in sorted(by_top[k], key=lambda r: r['x0']):
                if out and r['x0'] < out[-1][1] - 3:
                    out[-1] = (min(out[-1][0], r['x0']), max(out[-1][1], r['x1']))
                else:
                    out.append((r['x0'], r['x1']))
            return out

        colx = min(r['x0'] for r in cells)
        lrules = [r for r in pg.rects if r['height'] < 1.6 and r['width'] > 60 and r['x0'] < colx - 20]
        rules = cluster([r['top'] for r in lrules], 1.5)
        if len(rules) < 2:
            continue
        for top, bottom in [(rules[i], rules[i + 1]) for i in range(len(rules) - 1)]:
            cols = cols_at(top) or cols_at(bottom)
            if not cols:
                continue
            cx = cols[0][0]
            inb = [w for w in words if top - 0.5 <= (w['top'] + w['bottom']) / 2 <= bottom + 0.5]
            if not inb:
                continue
            # Sub-cells of the feature column (engine / transmission) are drawn as short rules at this row's edges.
            splits = sorted(set(round(r['x0']) for r in lrules if r['x0'] > 70 and (abs(r['top'] - top) < 2 or abs(r['top'] - bottom) < 2)))
            cell = lambda w: sum(1 for x in splits if w['x0'] >= x - 1)
            left = sorted([w for w in inb if w['x1'] <= cx + 2], key=lambda w: (cell(w), round(w['top']), w['x0']))
            right = [w for w in inb if w['x0'] >= cx - 2]
            parts = {}
            for w in left:
                parts.setdefault(cell(w), []).append(w['text'])
            text = ' / '.join(re.sub(r'\s+', ' ', ' '.join(v)).strip() for k, v in sorted(parts.items()))
            bold = bool(left) and all('Bold' in w['fontname'] for w in left)
            nonmark = [w for w in right if not MARK.match(w['text'])]
            if right and len(nonmark) >= len(right) / 2:
                above = [w for w in words if top - 40 <= w['top'] < top and w['x0'] >= cx - 2 and not MARK.match(w['text'])
                         and w['size'] <= max(x['size'] for x in nonmark) + 0.1]
                hdr_words = right + above
                names = [header_text([w for w in hdr_words if a - 2 <= (w['x0'] + w['x1']) / 2 <= b + 2]) for a, b in cols]
                # The section title is the band's own left text, or a bold capitals line just above the header.
                tl = [w for w in words if top - 30 <= w['top'] < top - 1 and w['x1'] <= cx and 'Bold' in w['fontname']]
                title_text = re.sub(r'\s+', ' ', ' '.join(w['text'] for w in sorted(tl, key=lambda w: (round(w['top']), w['x0'])))).strip()
                if text and text.upper() == text:
                    section = tidy(text)
                elif title_text and title_text.upper() == title_text and re.search(r'[A-Z]{3}', title_text):
                    section = tidy(title_text)
                parent = ''
                continue
            if not right:
                if not text:
                    continue
                if bold and text.upper() == text:
                    section, parent = tidy(text), ''
                else:
                    parent, parent_x = text, left[0]['x0']
                continue
            if names is not None and len(names) != len(cols):
                # The header row's cell rules split differently from the body's: name the body columns from the
                # header words that fall in them.
                names = [header_text([w for w in hdr_words if a - 2 <= (w['x0'] + w['x1']) / 2 <= b + 2]) for a, b in cols]
            if names is None:
                continue
            # A transmission column printed beside the engine is part of the row's text, not a trim.
            for i, (a, b) in enumerate(cols):
                if re.search(r'TRANSMISSION', names[i] or '', re.I):
                    extra = ' '.join(w['text'] for w in sorted([w for w in right if a - 2 <= (w['x0'] + w['x1']) / 2 <= b + 2], key=lambda w: (round(w['top']), w['x0'])))
                    if extra:
                        text = (text + ' / ' + extra).strip(' /')
            # A cell's mark can be printed as several words ("O/ P", "O /P"): read the cell's words together first.
            marks = [None] * len(cols)
            for i, (a, b) in enumerate(cols):
                ws = sorted([w for w in right if a - 2 <= (w['x0'] + w['x1']) / 2 <= b + 2], key=lambda w: (round(w['top']), w['x0']))
                joined = ''.join(w['text'] for w in ws)
                if ws and MARK.match(joined):
                    marks[i] = joined.replace('N/A', 'NA').rstrip('*')
                    continue
                for w in ws:
                    if MARK.match(w['text']):
                        marks[i] = w['text'].replace('N/A', 'NA').rstrip('*')
            indent = left[0]['x0'] if left else 0
            top_level = bool(left) and (not parent or indent <= parent_x + 2)
            rows.append({'page': pn, 'section': section, 'parent': '' if top_level else parent, 'text': text,
                         'names': names, 'marks': marks})
            if top_level:
                parent = ''
    # A column's header is sometimes misread on one page; when the table keeps the same number of columns
    # throughout, each column takes its most common name.
    if len(set(len(r['names']) for r in rows)) == 1:
        per = collections.defaultdict(collections.Counter)
        for r in rows:
            for i, n in enumerate(r['names']):
                per[i][n] += 1
        fixed = [per[i].most_common(1)[0][0] for i in sorted(per)]
        for r in rows:
            r['names'] = fixed
    for r in rows:
        r['marks'] = {n: m for n, m in zip(r['names'], r['marks']) if m and not re.search(r'TRANSMISSION', n, re.I)}
        del r['names']
    return {'kind': 'fa', 'title': title.replace(' FEATURE AVAILABILITY', ''), 'rows': rows}


if __name__ == '__main__':
    d = extract(sys.argv[1])
    json.dump(d, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
    cols = collections.Counter()
    for r in d['rows']:
        cols.update(r['marks'].keys())
    print(d['title'][:60], '| rows', len(d['rows']), '| cols', dict(cols))
