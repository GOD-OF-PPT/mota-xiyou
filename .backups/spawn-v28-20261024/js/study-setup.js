/* Task setup uses generated legal campaign states; it is not participant play. */
(function () {
  'use strict';
  const study = window.TowerStudy;
  if(!study?.valid || study.failure)return;
  try {
    const fixture = window.TOWER_STUDY_FIXTURES[study.variant][study.task];
    Object.assign(study,{startHash:fixture.startHash,budgetGroup:fixture.budgetGroup,source:fixture.source,trialId:fixture.id});
    const prior = JSON.parse(localStorage.getItem('study-setup') || 'null');
    if(prior && prior.startHash!==fixture.startHash)throw Error('本轮题目来源已变化，请在准备页使用新的轮次；旧进度仍保留。');
    if(!prior) {
      if(study.task!=='first-three')localStorage.setItem('dasheng-relic-tower-v1',JSON.stringify({state:fixture.state}));
      localStorage.setItem('study-setup',JSON.stringify({participant:study.participant,variant:study.variant,task:study.task,round:study.round,objective:study.objective,startHash:fixture.startHash,budgetGroup:fixture.budgetGroup,source:fixture.source,trialId:fixture.id,observedByHuman:false}));
    }
  } catch(error) { study.failure = error.message; }
})();
