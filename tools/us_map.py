#!/usr/bin/env python3
"""Build data/us-map.js, the state outlines the Legislation tab draws.

    python3 tools/us_map.py --topojson states-albers-10m.json            # writes data/us-map.js
    python3 tools/us_map.py --topojson <file> --tolerance 0.8 --out <path>

Source: the us-atlas package (https://github.com/topojson/us-atlas, ISC licence), file states-albers-10m.json, which is built
from US Census Bureau cartographic boundary files (public domain) and is already projected (Albers USA, with Alaska and Hawaii
inset) into a 975 x 610 box. This script does no network access: download that file once and point --topojson at it.

What it does, and why:
- Each shared border (an arc in the TopoJSON) is simplified once, with Douglas-Peucker, and every state that uses the arc gets
  the same simplified line, so neighbouring states still meet exactly. Simplifying each state's ring on its own would open
  slivers between them.
- Coordinates are rounded to a tenth and written as relative moves, which keeps the file small (a few tens of KB).
- Each state gets its USPS code, name, path, an anchor point (the centroid of its largest ring; the build stops if that falls
  outside the state) and its size: width, height and area. The page uses the anchor and the area to put a bigger invisible
  target on the very small shapes (DC, Rhode Island, Delaware), and the width and height to pick the nine states that also get
  a button beside the map. The states carry no letters of their own, so there is no label point.
Nothing here is typed in by hand except the FIPS-to-USPS table, which is checked to cover exactly the 51 shapes in the file.
"""
import argparse
import json
import math
import os
import sys

FIPS = {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
    '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
    '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
    '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
    '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
    '56': 'WY',
}


def decode_arcs(topo):
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return arcs


def douglas_peucker(pts, tol):
    """Keep the endpoints and every point that sits more than tol from the simplified line (iterative)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        lo, hi = stack.pop()
        (x1, y1), (x2, y2) = pts[lo], pts[hi]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        far, far_d = -1, tol
        for i in range(lo + 1, hi):
            x0, y0 = pts[i]
            d = math.hypot(x0 - x1, y0 - y1) if norm == 0 else abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm
            if d > far_d:
                far, far_d = i, d
        if far != -1:
            keep[far] = True
            stack.append((lo, far))
            stack.append((far, hi))
    return [p for p, k in zip(pts, keep) if k]


def ring_points(arc_ids, simple):
    pts = []
    for i in arc_ids:
        a = simple[i] if i >= 0 else simple[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def ring_area_centroid(pts):
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        cr = x0 * y1 - x1 * y0
        a += cr
        cx += (x0 + x1) * cr
        cy += (y0 + y1) * cr
    a *= 0.5
    if a == 0:
        return 0.0, pts[0][0], pts[0][1]
    return a, cx / (6 * a), cy / (6 * a)


def point_in_ring(px, py, pts):
    """Even-odd test: is (px, py) inside the ring?"""
    inside = False
    for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
        if (y0 > py) != (y1 > py) and px < (x1 - x0) * (py - y0) / (y1 - y0) + x0:
            inside = not inside
    return inside


def fmt(v):
    s = f'{v / 10:g}'
    return s


def path_d(rings):
    out = []
    for pts in rings:
        q = [(round(x * 10), round(y * 10)) for x, y in pts]
        dedup = [q[0]]
        for p in q[1:]:
            if p != dedup[-1]:
                dedup.append(p)
        if len(dedup) > 1 and dedup[0] == dedup[-1]:
            dedup.pop()
        if len(dedup) < 3:
            continue
        s = f'M{fmt(dedup[0][0])} {fmt(dedup[0][1])}l'
        parts = []
        for (x0, y0), (x1, y1) in zip(dedup, dedup[1:]):
            parts.append(f'{fmt(x1 - x0)} {fmt(y1 - y0)}')
        out.append(s + ' '.join(parts) + 'z')
    return ''.join(out)


def build(topo, tol):
    arcs = decode_arcs(topo)
    simple = [douglas_peucker(a, tol) for a in arcs]
    geoms = topo['objects']['states']['geometries']
    ids = {g['id'] for g in geoms}
    if ids != set(FIPS):
        sys.exit(f'ABORT: the file has {len(ids)} shapes and the FIPS table {len(FIPS)}; difference: {sorted(ids ^ set(FIPS))}')
    states = {}
    for g in geoms:
        polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
        rings, best = [], None
        for poly in polys:
            for ring_ids in poly:
                pts = ring_points(ring_ids, simple)
                rings.append(pts)
                area, cx, cy = ring_area_centroid(pts)
                if best is None or abs(area) > abs(best[0]):
                    best = (area, cx, cy, pts)
        if not point_in_ring(best[1], best[2], best[3]):
            sys.exit(f"ABORT: the anchor of {g['properties']['name']} ({best[1]:.1f}, {best[2]:.1f}) falls outside its outline")
        xs = [x for r in rings for x, _ in r]
        ys = [y for r in rings for _, y in r]
        total = sum(abs(ring_area_centroid(r)[0]) for r in rings)
        states[FIPS[g['id']]] = {
            'name': g['properties']['name'], 'd': path_d(rings), 'cx': round(best[1], 1), 'cy': round(best[2], 1),
            'w': round(max(xs) - min(xs), 1), 'h': round(max(ys) - min(ys), 1), 'a': round(total),
        }
    return states


def to_js(states, tol, src):
    lines = [
        '/* data/us-map.js: the state outlines the Legislation tab draws. GENERATED by tools/us_map.py, do not edit by hand.',
        f'   Source: us-atlas {src} (https://github.com/topojson/us-atlas, ISC licence), built from US Census Bureau',
        '   cartographic boundary files (public domain), projected as Albers USA with Alaska and Hawaii inset, into a 975 x 610',
        f'   box. Simplified at a tolerance of {tol} units, shared borders once, so neighbouring states still meet exactly.',
        '   Each state: name, d (SVG path, relative moves), cx and cy (a point inside it), w and h (extent), a (area).  */',
        'const US_MAP = {',
        '  width: 975, height: 610,',
        '  states: {',
    ]
    for code in sorted(states, key=lambda c: states[c]['name']):
        s = states[code]
        lines.append(f"    {code}: {{ name: {json.dumps(s['name'])}, cx: {s['cx']:g}, cy: {s['cy']:g}, w: {s['w']:g}, h: {s['h']:g}, a: {s['a']},")
        lines.append(f"      d: {json.dumps(s['d'])} }},")
    lines += ['  },', '};', '']
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--topojson', required=True, help='us-atlas states-albers-10m.json')
    ap.add_argument('--tolerance', type=float, default=0.7, help='simplification tolerance in map units (default 0.7)')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'us-map.js'))
    a = ap.parse_args()
    topo = json.load(open(a.topojson, encoding='utf-8'))
    states = build(topo, a.tolerance)
    text = to_js(states, a.tolerance, os.path.basename(a.topojson))
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'wrote {os.path.normpath(a.out)}: {len(states)} states, {len(text):,} bytes, tolerance {a.tolerance}')


if __name__ == '__main__':
    main()
