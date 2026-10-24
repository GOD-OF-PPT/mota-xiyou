"""Assemble acceptance only from successful reports and matching frozen sources."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
def read(f):return json.loads((ROOT/f).read_text(encoding='utf-8'))
def sha(f):return hashlib.sha256((ROOT/f).read_bytes()).hexdigest()
paths={'scene':'v18-cohesion-after.json','resolution':'v18-native-coverage.json',
 'firstSession':'v18-first-session-first-session.json','campaign':'v18-campaign.json',
 'choices':'v18-choices-choice-interaction.json','continuity':'v18-continuity-continuity.json',
 'props':'v18-prop-prop-integration.json','occlusion':'v18-occlusion.json',
 'isolation':'v18-asset-integrity.json','rebuild':'v18-rebuild-integrity.json','detailCapture':'v18-detail-capture.json'}
reports={k:read('audits/'+f) for k,f in paths.items()}
for key,r in reports.items():
    assert not r.get('errors'),(key,r.get('errors'))
    assert not r.get('failure'),(key,r.get('failure'))
    assert r.get('passed',True),(key,'explicit failed report')
for key in ['scene','firstSession','continuity']:
    for f,h in reports[key].get('source',{}).items():assert sha(f)==h,(key,f,'stale source')
for f,h in reports['rebuild']['hashes'].items():assert sha(f)==h,('stale rebuild',f)
baseline=read('audits/v18-cohesion-before.json')
for f in ['js/world.js','js/engine.js']:assert sha(f)==baseline['source'][f],('campaign source changed',f)
manifest=read('assets/material/manifest.json');registration=read('research/asset-registration-v18.json')
visible=[s for s in reports['resolution']['samples'] if s['visible']]
sources=['js/renderer.js','js/material-assets.js','assets/material/manifest.json',
 'scripts/prepare_material_native.py','scripts/prepare_material_v18.py','index.html',
 'js/world.js','js/engine.js','js/ui.js','js/journey.js','js/presentation.js']
visual=['audits/v18-detail-after-props-dpr2.png','audits/v18-detail-after-monster-buddha-dpr2.png',
 'audits/v18-after-material-first.png','audits/v18-after-material-courtyard-detail.png',
 'audits/v18-after-mural-first.png',*[f'audits/v18-chapter-floor-{n}.png' for n in [4,7,10,13,18]],'audits/v18-live-preview.png']
goals=[('P1','Same-condition baseline from legal checkpoints','audits/v18-cohesion-before.json'),
 ('P2','Authored crop isolation, transparent neighbours removed','audits/v18-asset-integrity.json'),
 ('P3','Physical contacts, scale and correct picking','audits/v18-cohesion-after.json'),
 ('P4','Native detail and eight reviewed HD replacements','audits/v18-native-coverage.json'),
 ('P5','Floor contact, masonry integration and contextual NPC mark',visual),
 ('P6','PC, legal progression, continuous UI sessions, both styles and offline',['audits/'+f for f in paths.values()])]
final={'date':'2026-10-23','status':'implemented_and_pc_accepted',
 'plan':'docs/v18-asset-cohesion-plan.md','review':'docs/v18-asset-cohesion-review.md',
 'goals':[{'id':i,'name':n,'status':'complete','evidence':e} for i,n,e in goals],
 'source':{f:sha(f) for f in sources},'runtimeAssets':{f:sha(f) for f in manifest['runtimeFiles']},
 'runtime':{'files':len(manifest['runtimeFiles']),'bytes':manifest['runtimeBytes'],
            'currentRegisteredGroups':sum(not r.get('supersededBy') for r in registration['records']),'hdReplacements':8},
 'checks':{k:{'report':'audits/'+paths[k],'passed':True,'groups':len(r.get('checks',[]))} for k,r in reports.items()},
 'resolution':{'totalDrawSamples':len(reports['resolution']['samples']),'visibleDrawSamples':len(visible),
               'minVisibleCoverage':min(s['ratio'] for s in visible),'floors':18,'dpr':[1,2],
               'scope':'New v18 sprite and landmark registrations, not all legacy hero/terrain/UI pixels'},
 'continuousSessions':[{'style':s['style'],'movementActions':s['steps'],'otherActions':s['actions'],
                        'blockingDialogues':s['blockingDialogues'],'noIntermediateLoad':True} for s in reports['firstSession']['sessions']],
 'visualReview':{'method':'Each screenshot opened individually at original size; browser-native detail crops without postprocess',
                 'files':{f:sha(f) for f in visual}},
 'livePreview':{'url':'http://127.0.0.1:8765/','browser':'Chrome','continuedExistingSave':True,
                'floor':1,'hp':620,'mana':[6,6],'keys':[1,0,0],'seals':0,'externalRelics':0,
                'objective':'Use insight to reveal the illusory wall','worldActionTaken':False,'screenshot':'audits/v18-live-preview.png'},
 'constraints':{'campaignAndEngineUnchanged':True,'finiteResources':True,'bothArtStyles':True,'offlineDirectIndex':True},
 'boundaries':['Representative original-size art review, not manual review of every placement on all eighteen floors',
               'Existing hero, terrain, UI and mural art were not fully remastered','Mobile and broad browser compatibility deferred',
               'Canonical-route agent play is not a blind human study or proof of long-term enjoyment']}
(ROOT/'audits/v18-final.json').write_text(json.dumps(final,ensure_ascii=False,indent=2),encoding='utf-8')
summary={k:final[k] for k in ['date','status','plan','review','goals','resolution','source','boundaries']}
summary.update(acceptance='audits/v18-final.json',remainingInScope=[])
(ROOT/'research/asset-cohesion-v18.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:final[k] for k in ['status','runtime','resolution','continuousSessions']},ensure_ascii=False,indent=2))
