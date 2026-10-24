"""Regression checks for the reported neighbouring fragments and false feet."""
from pathlib import Path
from PIL import Image
import json
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]
current=json.loads((ROOT/'assets/material/manifest.json').read_text(encoding='utf-8'))
old=json.loads((ROOT/'.backups/assets-v18-20261023/assets/material/manifest.json').read_text(encoding='utf-8'))

def components(manifest,key):
    a=manifest['assets'][key]; image=Image.open(ROOT/a['src']).convert('RGBA')
    image=image.crop((a['sx'],a['sy'],a['sx']+a['sourceW'],a['sy']+a['sourceH']))
    labels,_=ndimage.label(np.asarray(image)[:,:,3]>64)
    sizes=sorted(np.bincount(labels.ravel())[1:],reverse=True)
    return [int(n) for n in sizes if n>=30]

report={'reportedContamination':{},'checks':[]}
for key in ['prop_lamp','prop_monument']:
    before=components(old,key);after=components(current,key)
    assert len(before)>1,(key,'reproduction must expose real isolated neighbours')
    assert len(after)==1,(key,after)
    report['reportedContamination'][key]={'beforeComponents':before,'afterComponents':after}
    report['checks'].append(key+' has no opaque detached neighbour fragments')
stone=current['assets']['prop_monument'];assert .44<=stone['groundContact']['x']/stone['sourceW']<=.56
assert .85<=stone['groundContact']['y']/stone['sourceH']<=1
report['checks'].append('Stone contact is on the actual centered base rather than lower neighbour debris')
registration=json.loads((ROOT/'research/asset-registration-v18.json').read_text(encoding='utf-8'))
import hashlib
for path,digest in registration['sources'].items():
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest
for key,a in current['assets'].items():
    image=Image.open(ROOT/a['src'])
    assert a.get('sx',0)>=0 and a.get('sy',0)>=0,key
    assert a.get('sx',0)+a['sourceW']*a.get('frames',1)<=image.width,(key,'horizontal crop')
    assert a.get('sy',0)+a['sourceH']<=image.height,(key,'vertical crop')
    if 'nativeActorOrigin' in a:
        assert 0<=a['groundContact']['x']<=a['sourceW'],key
        assert a['sourceH']*.82<=a['groundContact']['y']<=a['sourceH'],(key,a['groundContact'])
report['checks'].append('All source rectangles, native actor feet and unchanged original-source hashes are valid')
for kind in ['buddha','pagoda','dragon','furnace','scripture','blacklotus']:
    a=current['assets']['landmark_'+kind]
    assert min(a['nativeContentSize'])>=900,(kind,'HD landmark is required')
report['checks'].append('All six landmark families use independently resolved HD assets')
report['passed']=True
(ROOT/'audits/v18-asset-integrity.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
