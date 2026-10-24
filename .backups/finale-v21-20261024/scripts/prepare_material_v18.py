"""Reviewed native-pixel isolation and physical registration. Originals are read-only.

This is technical sprite normalization, not art generation: no source pixel is
resized or sharpened. Explicit asset regions separate overlapping sheet rows;
component masks isolate neighbours, with reviewed detached attachments retained.
"""
from pathlib import Path
import copy
import hashlib
import json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'assets/material'
OUT = BASE / 'native-v18'
OUT.mkdir(exist_ok=True)
manifest = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))
entries = manifest['assets']
records = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def isolate(source, region, attachments=()):
    """An authored region, not a mathematical grid. Keep AA around reviewed parts."""
    image = Image.open(BASE / 'source' / source).convert('RGBA')
    tile = image.crop(region)
    a = np.asarray(tile).copy()
    labels, count = ndimage.label(a[:, :, 3] > 32)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    main = int(sizes.argmax())
    keep = labels == main
    # Explicit local points keep detached accessories; no blanket size pruning.
    for x, y in attachments:
        label = labels[y, x]
        if label:
            keep |= labels == label
    keep = ndimage.binary_dilation(keep, iterations=2)
    a[:, :, 3] = np.where(keep, a[:, :, 3], 0)
    result = Image.fromarray(a)
    bounds = result.getbbox()
    return result.crop(bounds), (region[0] + bounds[0], region[1] + bounds[1]), {
        'source': source, 'region': list(region), 'retainedAttachments': list(attachments),
        'paintedBounds': list(bounds), 'componentsBefore': int(count),
        'method': 'authored region plus selected silhouette and two-pixel antialias margin'
    }


def register(ids, image, name, contact, height, width, provenance, body=None, ground_x=8):
    target = OUT / (name + '.png')
    image.save(target, optimize=True)
    w, h = image.size
    scale = min(height * 3 / h, width * 3 / w)
    e = {'src': str(target.relative_to(ROOT)).replace('\\', '/'), 'sx': 0, 'sy': 0,
         'sourceW': w, 'sourceH': h, 'frames': 1, 'contentBounds': [0, 0, w, h],
         'nativeContentSize': [w, h], 'anchor': {'x': contact[0], 'y': contact[1]},
         'groundContact': {'x': contact[0], 'y': contact[1]}, 'logicalScale': scale,
         'sceneScale': 1, 'sceneGroundX': ground_x, 'registrationVersion': 18}
    if body:
        e['bodyBounds'] = body
    for key in ids:
        # Preserve legacy identity so rebuilding from either entry point is stable.
        old = entries.get(key, {})
        for origin in ['nativeRegistration', 'nativeHDOrigin']:
            if origin in old:
                e[origin] = old[origin]
        entries[key] = copy.deepcopy(e)
    records.append({'ids': ids, 'file': e['src'], 'pixels': [w, h],
                    'contact': e['groundContact'], 'worldSize': [w*scale/3, h*scale/3],
                    'sha256': digest(target), **provenance})


# Exact source-object bounds. Each main silhouette was checked on the source
# sheet; several extend beyond their old 6x7 cell, notably peach, plate and staff.
OBJECTS = [
 (15,10,180,180),(199,10,350,180),(387,10,550,180),(582,2,740,183),(796,0,952,183),(991,23,1157,175),
 (12,198,180,368),(215,177,366,376),(394,177,552,368),(558,204,774,371),(788,178,969,377),(983,179,1162,371),
 (3,378,190,563),(207,386,367,557),(375,370,554,569),(572,371,748,568),(767,371,957,565),(969,372,1167,568),
 (4,559,186,748),(189,559,395,750),(411,559,560,759),(578,559,756,759),(783,561,937,764),(968,582,1155,750),
 (0,741,189,953),(195,774,415,941),(441,752,547,949),(557,760,756,945),(772,752,965,938),(983,756,1165,935),
 (1,944,201,1130),(208,943,413,1133),(414,941,578,1135),(577,944,774,1128),(770,932,982,1134),(983,932,1172,1132),
 (3,1126,198,1338),(193,1155,457,1318),(453,1132,599,1335),(608,1127,781,1342),(770,1126,971,1332),(968,1128,1172,1331)
]
object_names = ['item_key_yellow','item_key_blue','item_key_red','item_atk','item_def','item_coin',
 'item_orb','item_mana','item_elixir','item_hp','treasure_iron','treasure_lotus',
 'treasure_thorn','treasure_tide','treasure_ember','treasure_mirror','prop_door_yellow','prop_door_blue',
 'prop_door_red','prop_gate','prop_altar','prop_relic','prop_monument','prop_chest',
 'prop_switch','prop_plate','prop_lamp','prop_stairs_up','prop_stairs_down','prop_seal',
 'prop_finale','prop_resonator','prop_rescue','prop_tide','prop_portal','prop_illusion',
 'prop_eye','prop_staff','prop_cicada','prop_clone','prop_gate_open','prop_door_open']
for i, (region, name) in enumerate(zip(OBJECTS, object_names)):
    ids = [key for key, old in entries.items()
           if old.get('nativeRegistration', {}).get('index') == i]
    # Retain the previously reviewed independent HD assets and chest.
    if i in [20, 23, 27, 28, 31] or not ids:
        continue
    image, origin, provenance = isolate('objects.png', region)
    w, h = image.size
    # Bottom face of the actual base, never the bottom of neighbouring pixels.
    cx, cy = w/2, h-2
    height, width = (16, 15)
    if name.startswith('item_'): height, width = 12, 12
    elif name.startswith('treasure_'): height, width = 13, 13
    elif name == 'prop_lamp': height, width = 15, 9
    elif name == 'prop_monument': height, width = 16.5, 12.5; cy = h-8
    elif name.startswith('prop_door') or name == 'prop_gate': height, width = 18, 14.8; cy = h-7
    elif name in ['prop_plate','prop_seal']: height, width = 8, 14; cy = h*.72
    register(ids, image, name, (cx,cy),height,width,provenance)

# Silhouette regions and deliberate foot positions in ORIGINAL sheet pixels.
# Clipped old grid rows are replaced by measured row boundaries.
CREATURES = [
 ((44,40,276,290),(231,280),15.5,14.8),((374,2,600,306),(476,297),21,16),
 ((651,3,967,313),(812,300),19,18),((982,0,1287,310),(1158,301),22,18),
 ((12,317,340,619),(178,601),17,19),((370,306,636,633),(522,623),22,18),
 ((639,309,975,627),(821,615),22,18),((1026,306,1286,629),(1166,617),24,19),
 ((49,613,275,907),(186,897),19,15),((367,630,652,908),(476,896),20,17),
 ((640,616,975,914),(817,897),21,17),((997,621,1307,913),(1159,898),21,18),
 ((44,906,303,1196),(174,1183),20,17),((347,910,620,1199),(468,1192),19,18),
 ((636,900,973,1199),(808,1192),24,21),((996,901,1308,1199),(1160,1191),24,21)
]
EXTRA = [
 ((31,32,300,306),(171,291),19,19),((315,0,612,314),(460,304),21,19),
 ((636,2,901,329),(765,316),21,18),((935,0,1235,313),(1094,302),22,19),
 ((14,309,300,624),(155,612),21,18),((321,309,610,619),(461,608),21,19),
 ((620,329,926,609),(774,593),19,20),((937,313,1217,620),(1084,608),21,18),
 ((26,610,293,910),(161,897),21,18),((301,615,634,904),(468,893),20,20),
 ((620,622,926,925),(779,914),21,18),((924,621,1244,916),(1084,904),22,19),
 ((9,902,286,1248),(165,1232),22,18),((317,901,605,1236),(456,1220),22,18),
 ((594,901,935,1238),(768,1221),22,21),((927,903,1244,1252),(1098,1238),23,20)
]
for family, source, regions in [('creatures','creatures-corrected.png',CREATURES),('enemies','enemies-extra.png',EXTRA)]:
    for i,(region,foot,height,width) in enumerate(regions):
        legacy_src = 'assets/material/atlases/'+family+'.png'
        ids = [key for key, old in entries.items() if
               (old.get('src') == legacy_src and old.get('sx') == i%4*256 and old.get('sy') == i//4*384)
               or old.get('nativeActorOrigin') == {'family':family,'index':i}]
        image, origin, provenance = isolate(source,region)
        contact=(foot[0]-origin[0],foot[1]-origin[1])
        register(ids,image,family+'-'+str(i),contact,height,width,provenance,
                 ground_x=9.5 if family=='creatures' and i==0 else 8)
        for key in ids: entries[key]['nativeActorOrigin']={'family':family,'index':i}

# Keep full-resolution original landmark silhouettes until standalone HD images
# are present. Each generated replacement is installed only after visual review.
LANDMARKS = [(7,4,555,517),(562,0,958,529),(998,5,1522,525),
             (0,516,582,999),(578,515,1047,1011),(1038,516,1536,1003)]
types=['buddha','pagoda','dragon','furnace','scripture','blacklotus']
themes=['jade','amber','blue','crimson','violet','gold']
for i,(kind,theme,region) in enumerate(zip(types,themes,LANDMARKS)):
    hd=BASE/'landmarks'/('landmark-'+kind+'-hd-v18.png')
    if hd.exists():
        image=Image.open(hd).convert('RGBA'); b=image.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
        entry={'src':str(hd.relative_to(ROOT)).replace('\\','/'),'sx':0,'sy':0,
               'sourceW':image.width,'sourceH':image.height,'frames':1,
               'contentBounds':list(b),'nativeContentSize':[b[2]-b[0],b[3]-b[1]],
               'anchor':{'x':image.width/2,'y':b[3]},'registrationVersion':18,'hd':True}
        if kind=='furnace':
            entry['statePoints']=[[image.width*x,image.height*y] for x,y in [(.21,.57),(.5,.5),(.8,.62)]]
        records.append({'ids':['landmark_'+kind,'landmark_'+theme], 'file':entry['src'],
                        'pixels':entry['nativeContentSize'],'sha256':digest(hd),'method':'reviewed standalone generated HD image, unchanged pixels'})
    else:
        image, origin, provenance=isolate('landmarks.png',region)
        target=OUT/('landmark-'+kind+'.png');image.save(target,optimize=True)
        entry={'src':str(target.relative_to(ROOT)).replace('\\','/'),'sx':0,'sy':0,
               'sourceW':image.width,'sourceH':image.height,'frames':1,
               'contentBounds':[0,0,image.width,image.height],'nativeContentSize':list(image.size),
               'anchor':{'x':image.width/2,'y':image.height},'registrationVersion':18}
        records.append({'ids':['landmark_'+kind,'landmark_'+theme],'file':entry['src'],
                        'pixels':list(image.size),'sha256':digest(target),**provenance})
    for key in ['landmark_'+kind,'landmark_'+theme]: entries[key]=copy.deepcopy(entry)

# Native coverage alone is not an art-quality gate. The first PC detail review
# still found a soft stele and imp, so these use standalone reviewed HD art.
for name,filename,height,width,contact_fraction in [
    ('prop_monument','props/monument-hd-v18.png',16.5,12.5,(.50,.955)),
    ('enemy_imp','props/imp-hd-v18.png',15.5,14.8,(.60,.91))
]:
    path=BASE/filename
    if not path.exists():continue
    image=Image.open(path).convert('RGBA');b=image.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox();bw,bh=b[2]-b[0],b[3]-b[1]
    old=entries[name]
    ids=[key for key,e in entries.items() if (name=='prop_monument' and key==name) or
         (name=='enemy_imp' and e.get('nativeActorOrigin')=={'family':'creatures','index':0})]
    entry={'src':str(path.relative_to(ROOT)).replace('\\','/'),'sx':0,'sy':0,
           'sourceW':image.width,'sourceH':image.height,'frames':1,'contentBounds':list(b),
           'nativeContentSize':[bw,bh],'logicalScale':min(height*3/bh,width*3/bw),
           'groundContact':{'x':b[0]+bw*contact_fraction[0],'y':b[1]+bh*contact_fraction[1]},
           'sceneScale':1,'sceneGroundX':9 if name=='enemy_imp' else 8,'registrationVersion':18,'hd':True}
    entry['anchor']=entry['groundContact']
    for key in ids:
        for field in ['nativeRegistration','nativeHDOrigin','nativeActorOrigin']:
            if field in entries[key]:entry[field]=entries[key][field]
        entries[key]=copy.deepcopy(entry)
    for record in records:
        if set(record['ids'])&set(ids):record['supersededBy']=entry['src']
    records.append({'ids':ids,'file':entry['src'],'pixels':[bw,bh],'contact':entry['groundContact'],
                    'sha256':digest(path),'method':'HD replacement after native-size PC review, unchanged generated pixels'})

# Lossless packing keeps exact native pixels while avoiding seventy small
# runtime requests. Two transparent guard pixels separate every source rect.
native_records=[r for r in records if '/native-v18/' in r['file'] and not r.get('supersededBy') and not r['ids'][0].startswith('landmark_')]
columns=8; slot=384
atlas=Image.new('RGBA',(columns*slot,((len(native_records)+columns-1)//columns)*slot))
atlas_path=OUT/'sprites.png'
for i,record in enumerate(native_records):
    image=Image.open(ROOT/record['file']).convert('RGBA')
    assert image.width+4<=slot and image.height+4<=slot,record['file']
    x=(i%columns)*slot+2; y=(i//columns)*slot+2
    atlas.alpha_composite(image,(x,y))
    record['runtimeFile']='assets/material/native-v18/sprites.png'
    record['atlasRect']=[x,y,image.width,image.height]
    for key in record['ids']:
        entries[key]['src']=record['runtimeFile'];entries[key]['sx']=x;entries[key]['sy']=y
atlas.save(atlas_path,optimize=True)

manifest['revision']=18
manifest['pipeline']='Authored native pixel isolation, physical contacts and reviewed HD landmarks; final DPR rendering'
manifest['runtimeFiles']=list(dict.fromkeys(e['src'] for e in entries.values()))
manifest['runtimeBytes']=sum((ROOT/f).stat().st_size for f in manifest['runtimeFiles'])
(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'js/material-assets.js').write_text('/* Reviewed native registrations. See scripts/prepare_material_v18.py. */\nwindow.MATERIAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'research/asset-registration-v18.json').write_text(json.dumps({'revision':18,'records':records,'runtimeBytes':manifest['runtimeBytes'],
 'sources':{str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in (BASE/'source').glob('*.png')}},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'registeredGroups':len(records),'runtimeFiles':len(manifest['runtimeFiles']),'runtimeBytes':manifest['runtimeBytes']}))
