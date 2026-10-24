"""Technical atlas normalization only: alpha cleanup, shared-scale registration and packing.
Original raster art is generated, reviewed and kept under assets/material/source.
Run with Pillow + NumPy; the shipped browser game never runs this script.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, math, numpy as np

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'assets/material'
OUT=BASE/'atlases'
OUT.mkdir(parents=True,exist_ok=True)
manifest={'revision':7,'style':'玄金神怪 · 三维古寺','pipeline':'3D-material pre-rendered raster assets; actors drawn directly from high resolution sources at final device pixel ratio','assets':{},'sources':[]}
def load(name):
    p=BASE/'source'/name
    im=Image.open(p).convert('RGBA');manifest['sources'].append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'width':im.width,'height':im.height})
    return im
def slots(im,cols,rows):
    return [im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows))) for y in range(rows) for x in range(cols)]
def clean(im,threshold=8):
    # Preserve smooth physically rendered edges. Never quantize this family to pixel art.
    a=np.array(im);a[:,:,3]=np.where(a[:,:,3]>threshold,a[:,:,3],0).astype(np.uint8)
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

def actor_slots(im):
    # The generated sheet's whitespace is not exactly a mathematical grid.
    # These reviewed cuts isolate poses before shared-scale foot registration.
    rows=[0,302,600,898,im.height];cols=[0,307,614,916,im.width]
    result=[]
    for y in range(4):
      for x in range(4):
        c=clean(im.crop((cols[x],rows[y],cols[x+1],rows[y+1])),32)
        a=np.array(c);mask=a[:,:,3]>32;seen=np.zeros(mask.shape,dtype=bool);h,w=mask.shape;largest=[]
        for yy in range(h):
          for xx in range(w):
            if not mask[yy,xx] or seen[yy,xx]:continue
            q=[(xx,yy)];seen[yy,xx]=True;component=[]
            while q:
              X,Y=q.pop();component.append((X,Y))
              for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                nx,ny=X+dx,Y+dy
                if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
            if len(component)>len(largest):largest=component
        keep=np.zeros(mask.shape,dtype=bool)
        for X,Y in largest:keep[Y,X]=True
        a[:,:,3]=np.where(keep,a[:,:,3],0);result.append(Image.fromarray(a))
    manifest['actorRegistration']={'sourceRows':rows,'sourceColumns':cols,'noise':'isolated components removed before registration','scale':'shared across sixteen poses'}
    return result
def normalize(cells,size,shared=False,anchor=None,unit=1):
    cells=[clean(c) for c in cells];bounds=[c.getbbox() or (0,0,1,1) for c in cells]
    anchor=anchor or (size[0]//2,size[1]-8)
    feet=[];scales=[]
    for c,b in zip(cells,bounds):
      crop=c.crop(b);a=np.array(crop)[:,:,3];ys=max(0,crop.height-max(6,round(crop.height*.035)));xx=np.nonzero(a[ys:]>32)[1]
      foot=float(np.median(xx)) if len(xx) else crop.width/2
      # Register by feet, then fit BOTH extents about that anchor. Width-only
      # fitting can silently crop a long staff or plume after registration.
      feet.append(foot)
      scales.append(min((anchor[0]-4*unit)/max(1,foot),(size[0]-anchor[0]-4*unit)/max(1,crop.width-foot),(anchor[1]-4*unit)/max(1,crop.height)))
    if shared:scales=[min(scales)]*len(cells)
    result=[]
    for c,b,s,foot in zip(cells,bounds,scales,feet):
      crop=c.crop(b)
      res=crop.resize((max(1,round(crop.width*s)),max(1,round(crop.height*s))),Image.Resampling.LANCZOS)
      canvas=Image.new('RGBA',size);canvas.alpha_composite(res,(round(anchor[0]-foot*s),round(anchor[1]-res.height)))
      result.append(canvas)
    return result
def pack(name,cells,cols,ids,size,anchors=None,frames=1,tileCells=None,logicalScale=1):
    rows=math.ceil(len(cells)/cols);atlas=Image.new('RGBA',(cols*size[0],rows*size[1]))
    for i,c in enumerate(cells):atlas.alpha_composite(c,((i%cols)*size[0],(i//cols)*size[1]))
    atlas.save(OUT/(name+'.png'),optimize=True)
    for i,id in enumerate(ids):
      if not id:continue
      e={'src':'assets/material/atlases/'+name+'.png','sx':(i%cols)*size[0],'sy':(i//cols)*size[1],'sourceW':size[0],'sourceH':size[1],'frames':frames,'anchor':anchors or {'x':size[0]//2,'y':size[1]-8}}
      if tileCells:e['tileCells']=tileCells
      if logicalScale!=1:e['logicalScale']=logicalScale
      e['contentBounds']=list(cells[i].getbbox() or (0,0,size[0],size[1]))
      manifest['assets'][id]=e
def alias(to,source):manifest['assets'][to]=dict(manifest['assets'][source])

wukong=normalize(actor_slots(load('wukong.png')),(384,384),shared=True,anchor=(192,352),unit=4)
pack('wukong',wukong,4,[None]*16,(384,384))
for row,d in enumerate(['down','right','up','left']):
    bounds=[list(c.getbbox() or (0,0,384,384)) for c in wukong[row*4:row*4+4]]
    union=[min(b[0] for b in bounds),min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds)]
    manifest['assets']['actor_wukong_'+d]={'src':'assets/material/atlases/wukong.png','sx':0,'sy':row*384,'sourceW':384,'sourceH':384,'frames':4,'anchor':{'x':192,'y':352},'logicalScale':0.25,'contentBounds':union,'frameBounds':bounds}

creature_ids=['enemy_imp','enemy_monk','enemy_ghost','enemy_guard','enemy_spider','enemy_yaksha','enemy_dragon','enemy_boss','npc_lantern','npc_bajie','npc_tangseng','npc_whitewutian','npc_qiao','npc_nezha','enemy_boss_1','enemy_boss_2']
pack('creatures',normalize(slots(load('creatures-corrected.png'),4,4),(256,384),anchor=(128,352),unit=4),4,creature_ids,(256,384),{'x':128,'y':352},logicalScale=0.25)
extra_ids=['enemy_bat','enemy_stone','enemy_thorn','enemy_viper','enemy_bone','enemy_water','enemy_crab','enemy_flame','enemy_alchemist','enemy_furnace','enemy_mirror','enemy_ink','enemy_sentinel','enemy_archivist','enemy_shade','enemy_wrath']
pack('enemies',normalize(slots(load('enemies-extra.png'),4,4),(256,384),anchor=(128,352),unit=4),4,extra_ids,(256,384),{'x':128,'y':352},logicalScale=0.25)
for key,target in {'acolyte':'monk','bell':'ghost','brass':'guard','puppet':'spider','judge':'yaksha','flood':'dragon','heart':'boss','thresholdImp':'imp','boss_0':'boss'}.items():alias('enemy_'+key,'enemy_'+target)
for i,target in enumerate(['guard','yaksha','dragon','furnace','mirror','boss_1']):alias('enemy_reliquary'+str(i),'enemy_'+target)
alias('npc_whiteWutian','npc_whitewutian')

object_ids=['item_key_yellow','item_key_blue','item_key_red','item_atk','item_def','item_coin','item_orb','item_mana','item_elixir','item_hp','treasure_iron','treasure_lotus','treasure_thorn','treasure_tide','treasure_ember','treasure_mirror','prop_door_yellow','prop_door_blue','prop_door_red','prop_gate','prop_altar','prop_relic','prop_monument','prop_chest','prop_switch','prop_plate','prop_lamp','prop_stairs_up','prop_stairs_down','prop_seal','prop_finale','prop_resonator','prop_rescue','prop_tide','prop_portal','prop_illusion','prop_eye','prop_staff','prop_cicada','prop_clone','prop_gate_open','prop_door_open']
pack('objects',normalize(slots(load('objects.png'),6,7),(64,64),anchor=(32,58)),6,object_ids,(64,64),{'x':32,'y':58})
for key,target in {'bars':'gate','choice':'resonator','fragment':'relic'}.items():alias('prop_'+key,'prop_'+target)
for key,target in {'yellowKey':'key_yellow','blueKey':'key_blue','redKey':'key_red','amber':'atk','ruby':'atk','jade':'def','emerald':'def','coins':'coin','peach':'hp','bigPeach':'hp','feast':'hp','orb':'orb','elixir':'elixir'}.items():alias('item_'+key,'item_'+target)

themes=['jade','amber','blue','crimson','violet','gold']
terrain=slots(load('terrain.png'),4,3)
terrain=[c.resize((384,384),Image.Resampling.LANCZOS) for c in terrain]
pack('terrain',terrain,4,['floor_'+x for x in themes]+['wall_'+x for x in themes],(384,384),{'x':0,'y':0},tileCells=4)
for id,target in {'terrain_cloud':'floor_blue','terrain_gap':'wall_blue','terrain_water':'wall_jade'}.items():alias(id,target)
landmarks=normalize(slots(load('landmarks.png'),3,2),(256,320),anchor=(128,312))
pack('landmarks',landmarks,3,['landmark_'+x for x in themes],(256,320),{'x':128,'y':312})
for key,target in zip(['buddha','pagoda','dragon','furnace','scripture','blacklotus'],themes):alias('landmark_'+key,'landmark_'+target)

fx=slots(load('fx.png'),6,4)
fx=[clean(c,8).resize((256,256),Image.Resampling.LANCZOS) for c in fx]
# Repack each effect as one horizontal four-frame strip. Keep slot center, never trim or rescale per pose.
ordered=[fx[row*6+col] for col in range(6) for row in range(4)]
pack('fx',ordered,4,[None]*24,(256,256))
for row,key in enumerate(['staff','morph','clone','door','pickup','relic']):manifest['assets']['fx_'+key]={'src':'assets/material/atlases/fx.png','sx':0,'sy':row*256,'sourceW':256,'sourceH':256,'frames':4,'anchor':{'x':128,'y':128},'logicalScale':0.375}
alias('fx_hit','fx_staff')

# High resolution facial crops are registered separately from full-body world
# frames. Long plumes must not force a conversation portrait into a tiny bust.
hero_source=Image.open(BASE/'source/wukong.png').convert('RGBA')
people_source=Image.open(BASE/'source/creatures-corrected.png').convert('RGBA')
portrait_specs=[('portrait_wukong',hero_source,(86,80,184,178))]
people_cells=slots(people_source,4,4)
for name,index,box in [
  ('lantern',8,(102,28,224,150)),('bajie',9,(90,20,222,152)),
  ('tangseng',10,(112,4,224,116)),('whitewutian',11,(106,20,222,136)),
  ('qiao',12,(70,17,186,133)),('nezha',13,(82,33,206,157))]:
    portrait_specs.append(('portrait_'+name,people_cells[index],box))
portrait_images=[clean(im.crop(box)).resize((128,128),Image.Resampling.LANCZOS) for _,im,box in portrait_specs]
pack('portraits',portrait_images,7,[id for id,_,_ in portrait_specs],(128,128),{'x':64,'y':128})
manifest['portraitRegistration']=[{'id':id,'crop':list(box),'source':'wukong.png' if i==0 else 'creatures-corrected.png'} for i,(id,_,box) in enumerate(portrait_specs)]
for key in ['ui_backdrop']:
    im=Image.open(BASE/(key+'.png'));manifest['assets'][key]={'src':'assets/material/'+key+'.png','sourceW':im.width,'sourceH':im.height,'frames':1,'anchor':{'x':0,'y':0}}
alias('ui_motif','ui_backdrop')

manifest['runtimeFiles']=list(dict.fromkeys(e['src'] for e in manifest['assets'].values()))
manifest['runtimeBytes']=sum((ROOT/p).stat().st_size for p in manifest['runtimeFiles'])
(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'js/material-assets.js').write_text('/* Generated from original local material artwork. See assets/material/manifest.json. */\nwindow.MATERIAL_MANIFEST='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print(json.dumps({'ids':len(manifest['assets']),'runtimeFiles':len(manifest['runtimeFiles']),'runtimeBytes':manifest['runtimeBytes']},ensure_ascii=False))

# Keep reviewed standalone props and native source rectangles as the last stage.
# A legacy 64px objects atlas may remain on disk, but is not a shipping source.
if (BASE/'props/altar-hd-v14.png').exists():
    import runpy
    runpy.run_path(str(ROOT/'scripts/prepare_material_native.py'),run_name='__main__')
