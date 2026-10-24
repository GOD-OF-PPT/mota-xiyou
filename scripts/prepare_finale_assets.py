"""Native sprite registration only: isolate three approved strip silhouettes.

No source image is resized, sharpened, recolored or overwritten. All three forms
share one logical scale and measured ground line. Rebuilds preserve prior IDs.
"""
from pathlib import Path
import copy,json,hashlib
from PIL import Image
import numpy as np
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[1]
records=[]
for family in ['material','mural']:
    base=ROOT/'assets'/family
    source=base/'finale/heart-three-forms-v21.png'
    if not source.exists():continue
    image=Image.open(source).convert('RGBA');alpha=np.asarray(image)[:,:,3]
    labels,_=ndimage.label(alpha>64);sizes=np.bincount(labels.ravel());regions=ndimage.find_objects(labels)
    silhouettes=sorted([(int(sizes[i]),b) for i,b in enumerate(regions,1) if sizes[i]>10000],key=lambda t:t[1][1].start)
    assert len(silhouettes)==3,(family,'Expected exactly three separated principal silhouettes',len(silhouettes))
    cuts=[]
    for _,b in silhouettes:
        x=max(0,b[1].start-2);y=max(0,b[0].start-2);right=min(image.width,b[1].stop+2);bottom=min(image.height,b[0].stop+2)
        crop=image.crop((x,y,right,bottom));paint=crop.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
        cuts.append((x,y,right-x,bottom-y,paint))
    target_h,target_w=(24,25) if family=='material' else (22,23)
    scale=min(min(target_h*3/(b[3]-b[1]),target_w*3/(b[2]-b[0])) for _,_,_,_,b in cuts)
    path=base/'manifest.json';manifest=json.loads(path.read_text(encoding='utf-8'))
    for i,(x,y,w,h,b) in enumerate(cuts):
        anchor={'x':(b[0]+b[2])/2,'y':b[3]-(b[3]-b[1])*.06}
        entry={'src':str(source.relative_to(ROOT)).replace('\\','/'),'sx':x,'sy':y,'sourceW':w,'sourceH':h,'frames':1,
               'contentBounds':list(b),'nativeContentSize':[b[2]-b[0],b[3]-b[1]],'anchor':anchor,'groundContact':anchor,
               'logicalScale':scale,'sceneScale':1,'registrationVersion':21,'finaleForm':i}
        ids=['enemy_boss_'+str(i)]+(['enemy_boss','enemy_heart'] if i==0 else [])
        for key in ids:
            new=copy.deepcopy(entry)
            for origin in ['nativeActorOrigin','nativeRegistration','nativeHDOrigin']:
                if origin in manifest['assets'].get(key,{}):new[origin]=manifest['assets'][key][origin]
            manifest['assets'][key]=new
        records.append({'style':family,'phase':i,'ids':ids,'source':entry['src'],'sourceRect':[x,y,w,h],'contentBounds':list(b),'groundContact':anchor,'logicalScale':scale,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    hero=base/'finale/wukong-cinematic-v21.png'
    if hero.exists():
        portrait=Image.open(hero).convert('RGBA')
        b=portrait.getchannel('A').point(lambda a:255 if a>=96 else 0).getbbox()
        anchor={'x':(b[0]+b[2])/2,'y':b[3]}
        manifest['assets']['cinematic_wukong']={'src':str(hero.relative_to(ROOT)).replace('\\','/'),'sx':0,'sy':0,'sourceW':portrait.width,'sourceH':portrait.height,'frames':1,'contentBounds':list(b),'nativeContentSize':[b[2]-b[0],b[3]-b[1]],'anchor':anchor,'groundContact':anchor,'logicalScale':72/(b[3]-b[1]),'sceneScale':1,'registrationVersion':21,'cinematicOnly':True}
        records.append({'style':family,'id':'cinematic_wukong','source':str(hero.relative_to(ROOT)).replace('\\','/'),'sourceRect':[0,0,portrait.width,portrait.height],'contentBounds':list(b),'sha256':hashlib.sha256(hero.read_bytes()).hexdigest()})
    manifest['revision']=max(21,manifest.get('revision',0));manifest['runtimeFiles']=list(dict.fromkeys(e['src'] for e in manifest['assets'].values()))
    manifest['runtimeBytes']=sum((ROOT/f).stat().st_size for f in manifest['runtimeFiles'])
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    if family=='material':
        (ROOT/'js/material-assets.js').write_text('/* Reviewed finale registrations; scripts/prepare_finale_assets.py. */\nwindow.MATERIAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
    else:
        loader=(ROOT/'scripts/mural-loader.js').read_text(encoding='utf-8')
        (ROOT/'js/assets.js').write_text('/* Reviewed mural finale registrations. */\nwindow.MURAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n'+loader,encoding='utf-8')
(ROOT/'research/finale-registration-v21.json').write_text(json.dumps({'date':'2026-10-24','records':records,'method':'native source rectangles, shared scale, explicit ground contact; original strip pixels unchanged'},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'styles':list(dict.fromkeys(r['style'] for r in records)),'registeredForms':sum('phase' in r for r in records),'cinematicHeroes':sum('id' in r for r in records)}))
