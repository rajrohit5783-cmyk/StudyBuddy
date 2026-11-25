const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function algorithmicPlan(subjects=[],hoursPerDay=3,requestedDays=7,now=new Date()){
  const horizon=clamp(Math.trunc(Number(requestedDays)||7),1,30),budget=clamp(Math.floor(Number(hoursPerDay)*60)||180,15,1440);
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const active=(Array.isArray(subjects)?subjects:[]).filter(s=>s&&typeof s.name==='string');
  const remaining=s=>Array.isArray(s.topics)?s.topics.filter((t,i)=>!(Array.isArray(s.done)?s.done[i]:s.completedTopics?.includes?.(t))):[];
  const score=s=>{const exam=new Date(`${s.exam||'2999-12-31'}T23:59:59`);const days=Math.max(0,(exam-start)/86400000);const confidence=clamp(Number(s.confidence)||50,0,100);const difficulty={Easy:0,Medium:8,Hard:16}[s.difficulty]||0;return 100/(days+2)+(100-confidence)*.65+difficulty+remaining(s).length*2;};
  const days=[];
  for(let d=0;d<horizon;d++){
    const date=new Date(start);date.setDate(start.getDate()+d);
    const ordered=[...active].sort((a,b)=>score(b)-score(a));
    const slots=[];let remainingMinutes=budget;let cursor=0;
    while(remainingMinutes>=20&&cursor<Math.min(ordered.length,4)){
      const s=ordered[(cursor+d)%Math.max(1,ordered.length)];if(!s)break;
      const topics=remaining(s);const topic=topics.length?topics[(d+cursor)%topics.length]:`Revision: ${s.name}`;
      const mins=Math.min(cursor===0?50:40,remainingMinutes);
      slots.push({time:`${String(17+cursor*2).padStart(2,'0')}:00`,subject:s.short||s.name,topic,minutes:mins,type:cursor===0?'deep-work':'revision',reason:`Priority score ${Math.round(score(s))}; ${topics.length?'unfinished topic':'revision'}`});
      remainingMinutes-=mins;cursor++;
    }
    if(slots.length)days.push({date:ymd(date),slots});
  }
  return {summary:'A balanced plan prioritizing exam proximity, confidence, difficulty and unfinished topics.',days};
}
