"""Summarize provided human observations; never manufacture missing samples."""
import json,sys,statistics,math
from pathlib import Path
source=Path(sys.argv[1]) if len(sys.argv)>1 else Path('research/v23-human-study-template.json')
output=Path(sys.argv[2]) if len(sys.argv)>2 else Path('research/v23-human-study-summary.json')
data=json.loads(source.read_text(encoding='utf-8'))
participants=data.get('participants',[])
assert isinstance(participants,list),'participants must be a list'
actual=[p for p in participants if p.get('observedByHuman') is True]
assert len({p['id'] for p in actual})==len(actual),'duplicate anonymous participant ids'
rows=[s for p in actual for s in p.get('sessions',[]) if s.get('participantQuote','').strip()]
understanding=[s for s in rows if all(type(s.get(k)) is bool for k in ['explainsGain','explainsCost','explainsForegone'])]
correct=sum(all(s[k] for k in ['explainsGain','explainsCost','explainsForegone']) for s in understanding)
pairs=[]
ambiguous_pairs=[]
for p in actual:
 groups={}
 for s in p.get('sessions',[]):
  value=s.get('executionSeconds')
  if s.get('completed') is not True or type(value) not in [int,float] or not math.isfinite(value) or value<0 or not all(s.get(k) for k in ['budgetGroup','objective','round']):continue
  if s.get('variant') not in ['baseline','new']:continue
  groups.setdefault((s.get('scenario'),s['budgetGroup'],s['objective'],str(s['round'])),{}).setdefault(s['variant'],[]).append(value)
 for (scenario,budget,objective,round_id),v in groups.items():
  context={'participant':p['id'],'scenario':scenario,'budgetGroup':budget,'objective':objective,'round':round_id}
  if any(len(values)>1 for values in v.values()):ambiguous_pairs.append(context);continue
  if len(v.get('baseline',[]))==1 and v['baseline'][0]>0 and len(v.get('new',[]))==1:pairs.append({**context,'baselineSeconds':v['baseline'][0],'newSeconds':v['new'][0],'reduction':1-v['new'][0]/v['baseline'][0]})
participant_judgments=[]
for p in actual:
 sessions=[s for s in p.get('sessions',[]) if s.get('participantQuote','').strip() and all(type(s.get(k)) is bool for k in ['explainsGain','explainsCost','explainsForegone'])]
 if sessions:participant_judgments.append(any(all(s[k] for k in ['explainsGain','explainsCost','explainsForegone']) for s in sessions))
result={'status':'observations_received' if rows else 'pending_human_observation','source':str(source),'participantsObserved':len(actual),'sessionsWithOriginalQuotes':len(rows),'understanding':{'assessedSessions':len(understanding),'fullyExplained':correct,'fraction':correct/len(understanding) if understanding else None,'assessedParticipants':len(participant_judgments),'participantsExplainingOneRoute':sum(participant_judgments),'participantFraction':sum(participant_judgments)/len(actual) if actual else None},'executionTimePairs':pairs,'ambiguousPairsExcluded':ambiguous_pairs,'medianExecutionReduction':statistics.median(p['reduction'] for p in pairs) if pairs else None,'limits':['Counts describe supplied observations only, not retention or population preference.','Missing times and judgments remain unknown.','Time pairs require completed tasks with the same scenario, budget, objective and round; ambiguous duplicates are excluded.','A human must assess plan reasoning and completion sense against original quotes.'],'fullyAccepted':False}
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':result['status'],'participantsObserved':len(actual),'sessionsWithOriginalQuotes':len(rows)},ensure_ascii=False))
