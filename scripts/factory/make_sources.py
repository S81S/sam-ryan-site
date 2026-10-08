"""Extracts every factory chart PDF into factory/sources/*.json and the fleet guides' paint colors into
factory/fbg-colors.json. The PDFs are not kept in the repo; download them first:
  - Fleet buyer's guides (2026): https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/
    brochures-literature/docs/buyers-guide/2026/26DOMMOP_FBG_<Model>.pdf, saved as <fbg dir>/<Model>.pdf
  - Feature Availability charts: https://media.stellantisnorthamerica.com/view-spec.do?id=<id> (ids below), saved as
    <fa dir>/<name>.pdf
Usage: python3 -I scripts/factory/make_sources.py <fbg dir> <fa dir>   (then: node scripts/factory/build.mjs)
"""
import importlib.util, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'factory')


def load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


FBG = {'Cherokee': 2026, 'Compass': 2026, 'Durango': 2026, 'Gladiator': 2026, 'GrandCherokee': 2026, 'Pacifica': 2026,
       'ProMaster': 2026, 'ProMasterEV': 2026, 'Ram1500': 2026, 'RamCC': 2026, 'RamHD': 2026, 'WagoneerS': 2025}
FBG_URL = ('https://www.stellantisfleet.com/content/dam/fca-fleet/na/fleet/en_us/shopping-tools/brochures-literature/'
           'docs/buyers-guide/2026/26DOMMOP_FBG_%s.pdf')
FA = {'2026-Jeep-Wrangler': 27222, '2025-Jeep-Wrangler': 26155, '2025-Jeep-Wrangler-4xe': 26157, '2026-Jeep-Gladiator': 27252,
      '2025-Jeep-Compass': 26014, '2025-Jeep-Grand-Cherokee': 26343, '2025-Jeep-Grand-Cherokee-4xe': 26341,
      '2025-Jeep-Grand-Cherokee-L': 26342, '2026-Jeep-Grand-Wagoneer': 27116, '2025-Jeep-Wagoneer-Grand-Wagoneer': 26285,
      '2025-Jeep-Wagoneer-L-Grand-Wagoneer-L': 26292, '2025-Jeep-Wagoneer-S': 26580, '2026-Jeep-Recon': 27236,
      '2027-Dodge-Charger-Daytona-Scat-Pack': 27792, '2027-Dodge-Charger-SIXPACK-engine': 27786,
      '2026-Dodge-Charger-SIXPACK-engine': 26963, '2026-Dodge-Charger-Daytona': 26798, '2025-Dodge-Charger-Daytona': 26587,
      '2027-Dodge-Durango-Durango-SRT': 27789, '2026-Dodge-Durango-Durango-SRT': 27418, '2025-Dodge-Durango-Durango-SRT': 26415,
      '2025-Dodge-Hornet-R-T': 26101, '2025-Dodge-Hornet-GT': 26102, '2027-Chrysler-Pacifica': 27614,
      '2026-Chrysler-Pacifica-Pacifica-Plug-In-Hybrid': 27043, '2026-Chrysler-Voyager': 27037, '2027-Ram-1500': 27735,
      '2026-Ram-1500': 27024, '2027-Ram-2500-3500-Heavy-Duty': 27337, '2026-Ram-2500-3500-Heavy-Duty': 27025,
      '2027-Ram-3500-4500-5500-Chassis-Cab': 28051, '2026-Ram-3500-4500-5500-Chassis-Cab': 27026,
      '2026-Ram-Professional-ProMaster-and-ProMaster-EV': 27027, '2027-Ram-Professional-ProMaster-City': 27533}


def main(fbg_dir, fa_dir):
    fbg, fa, colors = load('extract_fbg'), load('extract_fa'), load('colors_fbg')
    src = os.path.join(OUT, 'sources')
    os.makedirs(src, exist_ok=True)
    for name, year in FBG.items():
        d = fbg.normalize(os.path.join(fbg_dir, name + '.pdf'))
        d['url'] = FBG_URL % name
        json.dump(d, open(os.path.join(src, 'fbg-%d-%s.json' % (year, name)), 'w'), ensure_ascii=False, indent=0)
    for name, spec_id in FA.items():
        d = fa.extract(os.path.join(fa_dir, name + '.pdf'))
        d['kind'] = 'fa'
        d['title'] = d['title'].replace(' FEATURE AVAILABILITY', '')
        d['url'] = 'https://media.stellantisnorthamerica.com/view-spec.do?id=%d' % spec_id
        json.dump(d, open(os.path.join(src, 'fa-%s.json' % name), 'w'), ensure_ascii=False, indent=0)
    paint = {}
    for f in sorted(os.listdir(fbg_dir)):
        if f.endswith('.pdf'):
            paint[f[:-4]] = {'colors': colors.colors(os.path.join(fbg_dir, f)), 'url': FBG_URL % f[:-4]}
    json.dump(paint, open(os.path.join(OUT, 'fbg-colors.json'), 'w'), ensure_ascii=False, indent=1)
    print(len(os.listdir(src)), 'chart sources written')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
