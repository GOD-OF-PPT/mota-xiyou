"""Register original prop pixels and reviewed HD PNGs without resizing images.

Only manifests are written. Source images remain byte-for-byte unchanged.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/material'
manifest=json.loads((BASE/'manifest.json').read_text(encoding='utf-8'))
source=Image.open(BASE/'source/objects.png').convert('RGBA')
legacy={}
converted=0
for key,old in list(manifest['assets'].items()):
    if old.get('src')=='assets/material/atlases/objects.png':
        index=int(old.get('sy',0)/64)*6+int(old.get('sx',0)/64)
        legacy[key]={'index':index,'frame':old}
    elif old.get('nativeRegistration'):
        legacy[key]={'index':old['nativeRegistration']['index'],'frame':old['nativeRegistration']['legacyFrame']}
    elif old.get('nativeHDOrigin'):
        legacy[key]={'index':old['nativeHDOrigin']['index'],'frame':old['nativeHDOrigin']['legacyFrame']}

for key,record in legacy.items():
    old=record['frame'];index=record['index'];col=index%6;row=index//6
    x0=round(col*source.width/6);y0=round(row*source.height/7)
    x1=round((col+1)*source.width/6);y1=round((row+1)*source.height/7)
    cell=source.crop((x0,y0,x1,y1));alpha=np.asarray(cell)[:,:,3]
    ys,xs=np.nonzero(alpha>8)
    bx,by,br,bb=int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)
    crop=alpha[by:bb,bx:br];height,width=crop.shape
    bottom=max(0,height-max(6,round(height*.035)));feet=np.nonzero(crop[bottom:]>32)[1]
    foot=float(np.median(feet)) if len(feet) else width/2
    scale=min(28/max(1,foot),28/max(1,width-foot),54/max(1,height))
    offset_x=round(32-foot*scale);offset_y=round(58-round(height*scale))
    manifest['assets'][key]={
        'src':'assets/material/source/objects.png','sx':x0+bx,'sy':y0+by,
        'sourceW':width,'sourceH':height,'frames':1,
        'anchor':{'x':(32-offset_x)/scale,'y':(58-offset_y)/scale},
        'logicalScale':scale,'contentBounds':[0,0,width,height],
        'nativeContentSize':[width,height],
        'nativeRegistration':{'index':index,'scale':scale,'offset':[offset_x,offset_y],'legacyFrame':old}
    }
    converted+=1

hd={
    20:('prop_altar','altar-hd-v14.png'),
    27:('prop_stairs_up','stairs-up-hd-v14.png'),
    28:('prop_stairs_down','stairs-down-hd-v14.png'),
    31:('prop_resonator','resonator-hd-v14.png')
}
for index,(key,filename) in hd.items():
    im=Image.open(BASE/'props'/filename).convert('RGBA')
    b=im.getchannel('A').point(lambda n:255 if n>=96 else 0).getbbox()
    width,height=b[2]-b[0],b[3]-b[1]
    # Keep the old on-board envelope, while supplying true native pixels.
    old=legacy[key]['frame'];ob=old['contentBounds']
    scale=min((ob[2]-ob[0])/width,(ob[3]-ob[1])/height)
    anchor={'x':(b[0]+b[2])/2,'y':b[3]-height*.08}
    entry={'src':'assets/material/props/'+filename,'sx':0,'sy':0,
           'sourceW':im.width,'sourceH':im.height,'frames':1,
           'anchor':anchor,'groundContact':anchor,'contentBounds':list(b),
           'logicalScale':scale,'hd':True,'nativeContentSize':[width,height],
           'nativeHDOrigin':{'index':index,'legacyFrame':old}}
    for alias,record in legacy.items():
        if record['index']==index:manifest['assets'][alias]=dict(entry)

# Legacy atlas rebuilding must not replace the user's approved v13 chest.
chest_registration=ROOT/'research/chest-v13-registration.json'
if chest_registration.exists() and (BASE/'props/chest-v13.png').exists():
    chest=json.loads(chest_registration.read_text(encoding='utf-8'))['material']
    manifest['assets']['prop_chest']={'src':'assets/material/props/chest-v13.png','sx':0,'sy':0,'frames':1,**chest}

manifest['revision']=max(14,manifest.get('revision',0))
manifest['pipeline']='Native source rectangles and independent HD props, rendered directly at final DPR; no low-resolution prop atlas'
manifest['runtimeFiles']=list(dict.fromkeys(e['src'] for e in manifest['assets'].values()))
manifest['runtimeBytes']=sum((ROOT/f).stat().st_size for f in manifest['runtimeFiles'])
(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'js/material-assets.js').write_text('/* Native-resolution material registrations. See scripts/prepare_material_native.py. */\nwindow.MATERIAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(ROOT/'research/prop-native-v14.json').write_text(json.dumps({'nativeMappings':converted,'hdProps':list(hd.values()),'runtimeBytes':manifest['runtimeBytes']},indent=2),encoding='utf-8')
print(json.dumps({'nativeMappings':converted,'hdProps':list(hd.values())}))
