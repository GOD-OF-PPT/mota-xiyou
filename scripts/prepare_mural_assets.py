"""Technical atlas normalization only: alpha cleanup, shared-scale registration and packing.
Original raster art is generated, reviewed and kept under assets/mural/source.
Run with Pillow + NumPy; the shipped browser game never runs this script.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math, numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/mural'
OUT=BASE/'atlases'
OUT.mkdir(parents=True,exist_ok=True)
manifest={'revision':5,'style':'青绿重彩 · 壁画浮世','assets':{},'sources':[]}
def load(name):
    p=BASE/'source'/name
    im=Image.open(p).convert('RGBA');manifest['sources'].append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'width':im.width,'height':im.height})
    return im
def slots(im,cols,rows):
    return [im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows))) for y in range(rows) for x in range(cols)]
def clean(im,threshold=96):
    a=np.array(im);a[:,:,3]=np.where(a[:,:,3]>threshold,255,0).astype(np.uint8)
    return Image.fromarray(a)
def prune(im,min_size=3):
    a=np.array(im);mask=a[:,:,3]>0;seen=np.zeros(mask.shape,dtype=bool);h,w=mask.shape
    for y in range(h):
      for x in range(w):
        if not mask[y,x] or seen[y,x]:continue
        q=[(x,y)];seen[y,x]=True;group=[]
        while q:
          xx,yy=q.pop();group.append((xx,yy))
          for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
            X,Y=xx+dx,yy+dy
            if 0<=X<w and 0<=Y<h and mask[Y,X] and not seen[Y,X]:seen[Y,X]=True;q.append((X,Y))
        if len(group)<min_size:
          for xx,yy in group:a[yy,xx,3]=0
    return Image.fromarray(a)
def normalize(cells,size,shared=False,anchor=None):
    cells=[clean(c) for c in cells];bounds=[c.getbbox() or (0,0,1,1) for c in cells]
    scales=[min((size[0]-8)/(b[2]-b[0]),(size[1]-12)/(b[3]-b[1])) for b in bounds]
    if shared:scales=[min(scales)]*len(cells)
    result=[];anchor=anchor or (size[0]//2,size[1]-8)
    for c,b,s in zip(cells,bounds,scales):
      crop=c.crop(b);a=np.array(crop)[:,:,3];ys=max(0,crop.height-max(6,round(crop.height*.035)));xx=np.nonzero(a[ys:]>0)[1]
      foot=float(np.median(xx)) if len(xx) else crop.width/2
      res=crop.resize((max(1,round(crop.width*s)),max(1,round(crop.height*s))),Image.Resampling.NEAREST)
      canvas=Image.new('RGBA',size);canvas.alpha_composite(res,(round(anchor[0]-foot*s),round(anchor[1]-res.height)))
      result.append(prune(canvas))
    return result
def pack(name,cells,cols,ids,size,anchors=None,frames=1,tileCells=None):
    rows=math.ceil(len(cells)/cols);atlas=Image.new('RGBA',(cols*size[0],rows*size[1]))
    for i,c in enumerate(cells):atlas.alpha_composite(c,((i%cols)*size[0],(i//cols)*size[1]))
    atlas.save(OUT/(name+'.png'),optimize=True)
    for i,id in enumerate(ids):
      if not id:continue
      e={'src':'assets/mural/atlases/'+name+'.png','sx':(i%cols)*size[0],'sy':(i//cols)*size[1],'sourceW':size[0],'sourceH':size[1],'frames':frames,'anchor':anchors or {'x':size[0]//2,'y':size[1]-8}}
      if tileCells:e['tileCells']=tileCells
      e['contentBounds']=list(cells[i].getbbox() or (0,0,size[0],size[1]))
      manifest['assets'][id]=e
def alias(to,source):manifest['assets'][to]=dict(manifest['assets'][source])

wukong=normalize(slots(load('wukong.png'),4,4),(96,96),shared=True,anchor=(48,88))
pack('wukong',wukong,4,[None]*16,(96,96))
for row,d in enumerate(['down','right','up','left']):manifest['assets']['actor_wukong_'+d]={'src':'assets/mural/atlases/wukong.png','sx':0,'sy':row*96,'sourceW':96,'sourceH':96,'frames':4,'anchor':{'x':48,'y':88}}

manifest['assets']['portrait_wukong']={'src':'assets/mural/atlases/wukong.png','sx':32,'sy':30,'sourceW':40,'sourceH':40,'frames':1,'anchor':{'x':20,'y':40},'contentBounds':[0,0,40,40]}

creature_ids=['enemy_imp','enemy_monk','enemy_ghost','enemy_guard','enemy_spider','enemy_yaksha','enemy_dragon','enemy_boss','npc_lantern','npc_bajie','npc_tangseng','npc_whitewutian','npc_qiao','npc_nezha','enemy_boss_1','enemy_boss_2']
pack('creatures',normalize(slots(load('creatures.png'),4,4),(64,96)),4,creature_ids,(64,96),{'x':32,'y':88})
extra_ids=['enemy_bat','enemy_stone','enemy_thorn','enemy_viper','enemy_bone','enemy_water','enemy_crab','enemy_flame','enemy_alchemist','enemy_furnace','enemy_mirror','enemy_ink','enemy_sentinel','enemy_archivist','enemy_shade','enemy_wrath']
pack('enemies',normalize(slots(load('enemies-extra.png'),4,4),(64,96)),4,extra_ids,(64,96),{'x':32,'y':88})
for key,target in {'acolyte':'monk','bell':'ghost','brass':'guard','puppet':'spider','judge':'yaksha','flood':'dragon','heart':'boss','thresholdImp':'imp','boss_0':'boss'}.items():alias('enemy_'+key,'enemy_'+target)
for i,target in enumerate(['guard','yaksha','dragon','furnace','mirror','boss_1']):alias('enemy_reliquary'+str(i),'enemy_'+target)
alias('npc_whiteWutian','npc_whitewutian')

object_ids=['item_key_yellow','item_key_blue','item_key_red','item_atk','item_def','item_coin','item_orb','item_mana','item_elixir','item_hp','treasure_iron','treasure_lotus','treasure_thorn','treasure_tide','treasure_ember','treasure_mirror','prop_door_yellow','prop_door_blue','prop_door_red','prop_gate','prop_altar','prop_relic','prop_monument','prop_chest','prop_switch','prop_plate','prop_lamp','prop_stairs_up','prop_stairs_down','prop_seal','prop_finale','prop_resonator','prop_rescue','prop_tide','prop_portal','prop_illusion','prop_eye','prop_staff','prop_cicada','prop_clone','prop_gate_open','prop_door_open']
pack('objects',normalize(slots(load('objects.png'),6,7),(64,64),anchor=(32,58)),6,object_ids,(64,64),{'x':32,'y':58})
for key,target in {'bars':'gate','choice':'resonator','fragment':'relic'}.items():alias('prop_'+key,'prop_'+target)
for key,target in {'yellowKey':'key_yellow','blueKey':'key_blue','redKey':'key_red','amber':'atk','ruby':'atk','jade':'def','emerald':'def','coins':'coin','peach':'hp','bigPeach':'hp','feast':'hp','orb':'orb','elixir':'elixir'}.items():alias('item_'+key,'item_'+target)

themes=['jade','amber','blue','crimson','violet','gold']
terrain=slots(load('terrain.png'),4,3)
terrain=[c.resize((192,192),Image.Resampling.NEAREST) for c in terrain]
pack('terrain',terrain,4,['floor_'+x for x in themes]+['wall_'+x for x in themes],(192,192),{'x':0,'y':0},tileCells=4)
for id,target in {'terrain_cloud':'floor_blue','terrain_gap':'wall_blue','terrain_water':'wall_jade'}.items():alias(id,target)
landmarks=normalize(slots(load('landmarks.png'),3,2),(256,320),anchor=(128,312))
pack('landmarks',landmarks,3,['landmark_'+x for x in themes],(256,320),{'x':128,'y':312})
for key,target in zip(['buddha','pagoda','dragon','furnace','scripture','blacklotus'],themes):alias('landmark_'+key,'landmark_'+target)

fx=slots(load('fx.png'),6,4)
fx=[clean(c,24).resize((96,96),Image.Resampling.NEAREST) for c in fx]
# Repack each effect as one horizontal four-frame strip. Keep slot center, never trim or rescale per pose.
ordered=[fx[row*6+col] for col in range(6) for row in range(4)]
pack('fx',ordered,4,[None]*24,(96,96))
for row,key in enumerate(['staff','morph','clone','door','pickup','relic']):manifest['assets']['fx_'+key]={'src':'assets/mural/atlases/fx.png','sx':0,'sy':row*96,'sourceW':96,'sourceH':96,'frames':4,'anchor':{'x':48,'y':48}}
alias('fx_hit','fx_staff')
for key in ['ui_backdrop','ui_motif']:
    im=Image.open(BASE/(key+'.png'));manifest['assets'][key]={'src':'assets/mural/'+key+'.png','sourceW':im.width,'sourceH':im.height,'frames':1,'anchor':{'x':0,'y':0}}

manifest['runtimeFiles']=list(dict.fromkeys(e['src'] for e in manifest['assets'].values()))
manifest['runtimeBytes']=sum((ROOT/p).stat().st_size for p in manifest['runtimeFiles'])
(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
loader=(ROOT/'scripts/mural-loader.js').read_text(encoding='utf-8')
(ROOT/'js/assets.js').write_text('/* Generated from reviewed local raster art. See assets/mural/manifest.json. */\nwindow.MURAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n'+loader,encoding='utf-8')
print(json.dumps({'ids':len(manifest['assets']),'runtimeFiles':len(manifest['runtimeFiles']),'runtimeBytes':manifest['runtimeBytes']},ensure_ascii=False))

if (ROOT/'scripts/prepare_finale_assets.py').exists() and (BASE/'finale/heart-three-forms-v21.png').exists():
    import runpy
    runpy.run_path(str(ROOT/'scripts/prepare_finale_assets.py'),run_name='__main__')
