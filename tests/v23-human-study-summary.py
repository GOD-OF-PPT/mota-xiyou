"""Synthetic unit fixtures only; these never enter research observation records."""
import json,sys,subprocess,tempfile,copy
from pathlib import Path

with tempfile.TemporaryDirectory(prefix='mota-summary-unit-') as directory:
 source=Path(directory)/'synthetic.json'
 output=Path(directory)/'summary.json'
 def summarize(participants):
  source.write_text(json.dumps({'participants':participants}),encoding='utf-8')
  subprocess.run([sys.executable,'scripts/summarize_v23_human_study.py',str(source),str(output)],check=True,capture_output=True)
  return json.loads(output.read_text(encoding='utf-8'))
 def row(variant,**changes):
  return {'scenario':'silk','variant':variant,'budgetGroup':'unit-only','objective':'atk','round':'1','completed':True,'executionSeconds':100 if variant=='baseline' else 80,'participantQuote':'synthetic unit fixture','explainsGain':True,'explainsCost':True,'explainsForegone':True,**changes}
 def participant(*sessions):return {'id':'unit-only','observedByHuman':True,'sessions':list(sessions)}
 empty=summarize([]);assert empty['participantsObserved']==0 and empty['medianExecutionReduction'] is None and not empty['fullyAccepted']
 pair=summarize([participant(row('baseline'),row('new'))]);assert len(pair['executionTimePairs'])==1 and abs(pair['medianExecutionReduction']-.2)<1e-8
 for field,value in [('objective','def'),('round','2'),('budgetGroup','other'),('scenario','ferry'),('completed',False),('executionSeconds',None)]:
  changed=summarize([participant(row('baseline'),row('new',**{field:value}))]);assert changed['executionTimePairs']==[],field
 duplicate=summarize([participant(row('baseline'),row('new'),row('new'))]);assert not duplicate['executionTimePairs'] and len(duplicate['ambiguousPairsExcluded'])==1
 unobserved=participant(row('baseline'),row('new'));unobserved['observedByHuman']=False;assert summarize([unobserved])['participantsObserved']==0
 missing={'id':'unit-missing','observedByHuman':True,'sessions':[]}
 counts=summarize([participant(row('baseline'),row('new')),missing]);assert counts['understanding']['participantsExplainingOneRoute']==1 and counts['understanding']['participantFraction']==.5
print('PASS synthetic summary checks: empty input, exact completed pairing, mismatches, duplicates, observation flag and participant denominator')
