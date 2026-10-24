"""Register generated art only: extract poses, share scale, align soles, pack PNGs.

No painting, palette filters, background removal or alpha rewriting. Original
ImageGen files remain unchanged. Connected components locate the 16 figures;
the model's uneven gutters are not treated as a perfect arithmetic 4x4 grid.
"""
from pathlib import Path
from PIL import Image
from scipy import ndimage
import numpy as np
import json, hashlib

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/material/hero-v30'
raw = Image.open(BASE / 'wukong-atlas-raw.png').convert('RGBA')
seed = Image.open(BASE / 'wukong-seed.png').convert('RGBA')
pixels = np.array(raw)
labels, count = ndimage.label(pixels[:, :, 3] >= 16, np.ones((3, 3)))
sizes = np.bincount(labels.ravel())
components = []
for ident in range(1, count + 1):
    if sizes[ident] < 5000:
        continue
    ys, xs = np.where(labels == ident)
    box = (max(0, int(xs.min()) - 2), max(0, int(ys.min()) - 2), min(raw.width, int(xs.max()) + 3), min(raw.height, int(ys.max()) + 3))
    components.append({'box': box, 'row': min(3, int(ys.mean() / (raw.height / 4))), 'centerX': float(xs.mean())})
assert len(components) == 16, 'Expected 16 separate character poses'
groups = [[*sorted([p for p in components if p['row'] == row], key=lambda p: p['centerX'])] for row in range(4)]
assert all(len(row) == 4 for row in groups)

FRAME, AX, AY = 512, 256, 464
atlas = Image.new('RGBA', (FRAME * 4, FRAME * 4))
directions = ['down', 'right', 'up', 'left']
records = []
for row, group in enumerate(groups):
    frames, contacts, source_boxes = [], [], []
    for column, item in enumerate(group):
        tile = raw.crop(item['box'])
        a = np.array(tile)[:, :, 3]
        solid = a >= 16
        yy, xx = np.where(solid)
        bottom = int(yy.max())
        near = solid.copy()
        near[:max(0, bottom - 18)] = False
        cy, cx = np.where(near)
        foot_x = int(round(float(cx.mean())))
        dx, dy = AX - foot_x, AY - bottom
        assert dx >= 12 and dy >= 12 and dx + tile.width <= FRAME - 12 and dy + tile.height <= FRAME - 12
        frame = Image.new('RGBA', (FRAME, FRAME))
        # Paste RGBA bytes directly, without alpha compositing or recoloring.
        frame.paste(tile, (dx, dy))
        atlas.paste(frame, (column * FRAME, row * FRAME))
        bounds = frame.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
        frames.append(list(bounds))
        projection = near.sum(axis=0)
        runs, start = [], None
        for x in range(tile.width + 1):
            occupied = x < tile.width and projection[x] >= 2
            if occupied and start is None:
                start = x
            if not occupied and start is not None:
                if x - start >= 3:
                    runs.append((start, x))
                start = None
        feet = []
        for left, right in runs:
            local_y = np.where(near[:, left:right])[0]
            if local_y.size and local_y.max() >= bottom - 8:
                feet.append([round(dx + (left + right - 1) / 2, 2), right - left, int(dy + local_y.max())])
        assert feet, 'Missing sole contact'
        contacts.append(feet)
        source_boxes.append(list(item['box']))
    records.append({'direction': directions[row], 'frameBounds': frames, 'bootContacts': contacts, 'sourceBoxes': source_boxes})

atlas_path = BASE / 'wukong-atlas.png'
atlas.save(atlas_path)
# Same source character supplies the matching face, never the old portrait atlas.
portrait_box = tuple(round(v * seed.width / 1254) for v in (470, 160, 815, 505))
portrait = seed.crop(portrait_box)
portrait.save(BASE / 'wukong-portrait.png')

manifest_path = ROOT / 'assets/material/manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
idle_height = max(r['frameBounds'][0][3] - r['frameBounds'][0][1] for r in records)
logical_scale = 23 * 3 / idle_height
for row, record in enumerate(records):
    b = record['frameBounds']
    manifest['assets']['actor_wukong_' + record['direction']] = {
        'src': 'assets/material/hero-v30/wukong-atlas.png', 'sx': 0, 'sy': row * FRAME,
        'sourceW': FRAME, 'sourceH': FRAME, 'frames': 4, 'anchor': {'x': AX, 'y': AY},
        'groundContact': {'x': AX, 'y': AY}, 'logicalScale': logical_scale, 'sceneScale': 1,
        'contentBounds': [min(v[0] for v in b), min(v[1] for v in b), max(v[2] for v in b), max(v[3] for v in b)],
        'frameBounds': b, 'bootContacts': record['bootContacts'], 'registrationVersion': 30,
        'nativeContentSize': [max(v[2] - v[0] for v in b), max(v[3] - v[1] for v in b)], 'sharedSourceScale': 1,
    }
manifest['assets']['portrait_wukong'] = {'src': 'assets/material/hero-v30/wukong-portrait.png', 'sx': 0, 'sy': 0, 'sourceW': portrait.width, 'sourceH': portrait.height, 'frames': 1, 'anchor': {'x': portrait.width / 2, 'y': portrait.height}, 'contentBounds': list(portrait.getchannel('A').getbbox())}
seed_bounds = seed.getchannel('A').point(lambda v: 255 if v >= 16 else 0).getbbox()
manifest['assets']['cinematic_wukong'] = {'src': 'assets/material/hero-v30/wukong-seed.png', 'sx': 0, 'sy': 0, 'sourceW': seed.width, 'sourceH': seed.height, 'frames': 1, 'anchor': {'x': seed.width / 2, 'y': seed_bounds[3]}, 'contentBounds': list(seed_bounds), 'nativeContentSize': [seed_bounds[2] - seed_bounds[0], seed_bounds[3] - seed_bounds[1]], 'logicalScale': 72 * 3 / (seed_bounds[3] - seed_bounds[1]), 'registrationVersion': 30}
manifest['revision'] = 30
manifest['pipeline'] = 'ImageGen coherent temple-material hero; 16 native poses, shared scale and registered sole contacts'
manifest['runtimeFiles'] = list(dict.fromkeys(v['src'] for v in manifest['assets'].values()))
manifest['runtimeBytes'] = sum((ROOT / p).stat().st_size for p in manifest['runtimeFiles'])
manifest['sources'] = [s for s in manifest['sources'] if not s['file'].startswith('assets/material/hero-v30/')]
manifest['sources'].extend([{'file': 'assets/material/hero-v30/wukong-seed.png', 'width': seed.width, 'height': seed.height}, {'file': 'assets/material/hero-v30/wukong-atlas-raw.png', 'width': raw.width, 'height': raw.height}])
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'js/material-assets.js').write_text('/* Local generated-art registrations; scripts/prepare_hero_v30.py. */\nwindow.MATERIAL_MANIFEST=' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
audit = {'frames': 16, 'frameSize': FRAME, 'anchor': [AX, AY], 'sharedSourceScale': 1, 'logicalScale': logical_scale, 'registration': records, 'portraitSourceBox': list(portrait_box), 'files': {str(p.relative_to(ROOT)).replace('\\', '/'): {'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in BASE.glob('*.png')}}
(ROOT / 'research/hero-v30/registration.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'poses': 16, 'sourceScale': 1, 'logicalScale': logical_scale, 'runtimePNG': str(atlas_path.relative_to(ROOT)), 'runtimeBytes': manifest['runtimeBytes']}))
