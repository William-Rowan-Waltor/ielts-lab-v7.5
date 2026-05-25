const IELTS_WRITING_SOURCE_NOTE = "Aligned to public IELTS Writing band-descriptor concepts; not an official IELTS examiner score.";

function writingCriteria(taskType) {
  return taskType==="task2"
    ? [{k:"tr",n:"TR",full:"Task Response"},{k:"cc",n:"CC",full:"Coherence & Cohesion"},{k:"lr",n:"LR",full:"Lexical Resource"},{k:"gra",n:"GRA",full:"Grammatical Range & Accuracy"}]
    : [{k:"ta",n:"TA",full:"Task Achievement"},{k:"cc",n:"CC",full:"Coherence & Cohesion"},{k:"lr",n:"LR",full:"Lexical Resource"},{k:"gra",n:"GRA",full:"Grammatical Range & Accuracy"}];
}

function criterionBand(result, key) {
  if (!result) return null;
  const item = result[key] || (key==="tr" ? result.ta : null);
  return item?.band ?? null;
}

function normalizeCriterion(value) {
  const v = value && typeof value==="object" ? value : {};
  return {
    band: Number(v.band)||0,
    strengths: Array.isArray(v.strengths) ? v.strengths : [],
    weaknesses: Array.isArray(v.weaknesses) ? v.weaknesses : [],
    evidence: Array.isArray(v.evidence) ? v.evidence : [],
    whyNotHigher: v.whyNotHigher || v.why_not_higher || ""
  };
}

function roundWritingBand(n) {
  return Math.round((Number(n)||0)*2)/2;
}

function examinerScoreSummary(result, taskType) {
  const a = result?.examinerA?.overall ?? result?.examinerA?.band;
  const b = result?.examinerB?.overall ?? result?.examinerB?.band;
  const final = result?.overall;
  const nums = [a,b,final].filter(x=>Number.isFinite(Number(x))).map(Number);
  if (!nums.length) return null;
  const low = roundWritingBand(Math.min(...nums));
  const high = roundWritingBand(Math.max(...nums));
  const spread = high - low;
  return {
    low, high, spread,
    label: spread <= .5 ? "High confidence" : spread <= 1 ? "Moderate confidence" : "Low confidence",
    note: taskType==="task2" ? "Task 2 score is still weighted twice in full Writing." : "Task 1 contributes one third of the full Writing score."
  };
}

function defaultTaskAudit(taskType, wordCount) {
  if (taskType==="task2") {
    return [
      {label:"All parts answered",status:"review",note:"Check whether each part of the prompt is explicitly addressed."},
      {label:"Clear position",status:"review",note:"Position should remain stable from introduction to conclusion."},
      {label:"Ideas developed",status:"review",note:"Body paragraphs need explanation plus relevant examples."},
      {label:"Word count",status:wordCount>=250?"pass":"warning",note:wordCount>=250?"Meets the 250+ word target.":"Below the 250-word exam target."}
    ];
  }
  return [
    {label:"Overview present",status:"review",note:"Task 1 needs a clear overall summary of main trends/features."},
    {label:"Key features selected",status:"review",note:"Do not describe every number; choose the most important comparisons."},
    {label:"Data accuracy",status:"review",note:"Figures and units should match the visual exactly."},
    {label:"Word count",status:wordCount>=150?"pass":"warning",note:wordCount>=150?"Meets the 150+ word target.":"Below the 150-word exam target."}
  ];
}

function normalizeWritingExaminerResult(raw, taskType, essay) {
  const result = raw?.final && typeof raw.final==="object" ? {...raw.final, ...raw, final:raw.final} : {...(raw||{})};
  const criteria = writingCriteria(taskType);
  criteria.forEach(({k})=>{
    const source = result[k] || (k==="tr" ? result.ta : null);
    result[k] = normalizeCriterion(source);
  });
  if (taskType==="task2") result.ta = result.tr;
  if (!result.overall) {
    result.overall = roundWritingBand(criteria.reduce((sum,c)=>sum+(Number(result[c.k]?.band)||0),0)/4);
  } else result.overall = roundWritingBand(result.overall);
  if (!result.overallComment) result.overallComment = "Estimated band based on IELTS public descriptor concepts.";
  if (!result.topPriority) result.topPriority = "Improve the weakest criterion with a focused rewrite.";
  if (!result.topStrength) result.topStrength = "Review the criterion breakdown for the strongest feature.";
  if (!Array.isArray(result.annotations)) result.annotations = [];
  result.annotations = result.annotations.filter(a=>a && a.sentence && essay.includes(a.sentence));
  if (!Array.isArray(result.topicRelevantUnusedAWL)) result.topicRelevantUnusedAWL = [];
  if (!Array.isArray(result.taskAudit)) result.taskAudit = defaultTaskAudit(taskType, essay.trim().split(/\s+/).filter(Boolean).length);
  if (!result.band7GapDrill || typeof result.band7GapDrill!=="object") {
    result.band7GapDrill = {
      title:"Band 7 gap rewrite",
      targetCriterion:criteria.sort((a,b)=>(result[a.k]?.band||0)-(result[b.k]?.band||0))[0]?.full || "weakest criterion",
      instruction:"Rewrite the weakest paragraph once, focusing only on the criterion with the lowest band.",
      successCheck:"The rewritten version should be clearer, more specific, and easier to score at Band 7."
    };
  }
  result.confidence = result.confidence || examinerScoreSummary(result, taskType);
  result.sourceNote = result.sourceNote || IELTS_WRITING_SOURCE_NOTE;
  return result;
}

function writingExaminerPromptAddendum(taskType) {
  const first = taskType==="task2" ? "tr" : "ta";
  const firstName = taskType==="task2" ? "Task Response" : "Task Achievement";
  const auditFocus = taskType==="task2"
    ? "all parts answered, position clarity, idea development, paragraph focus, word count"
    : "overview, key feature selection, accurate data support, comparisons, word count";
  return `Use public IELTS Writing band-descriptor concepts. Be conservative: if evidence is mixed, choose the lower plausible half-band.
Run TWO independent examiner passes internally:
- examinerA = strict examiner
- examinerB = standard examiner
Then produce final criterion scores.

For each criterion, include strengths, weaknesses, evidence from the essay, and whyNotHigher.
Task audit focus: ${auditFocus}.

Return ONLY valid JSON:
{"examinerA":{"overall":6.5,"${first}":6.5,"cc":6.5,"lr":6.5,"gra":6.5,"summary":"strict score rationale"},"examinerB":{"overall":7.0,"${first}":7.0,"cc":7.0,"lr":7.0,"gra":7.0,"summary":"standard score rationale"},"${first}":{"band":7.0,"strengths":["specific"],"weaknesses":["specific"],"evidence":["short quoted evidence"],"whyNotHigher":"why this is not a higher band for ${firstName}"},"cc":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"lr":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"gra":{"band":7.0,"strengths":[],"weaknesses":[],"evidence":[],"whyNotHigher":""},"overall":7.0,"overallComment":"2-3 sentence examiner-style assessment","taskAudit":[{"label":"audit item","status":"pass|warning|fail","note":"specific evidence"}],"topPriority":"single highest-impact fix","topStrength":"strongest scoring feature","band7GapDrill":{"title":"short drill name","targetCriterion":"criterion name","instruction":"10-minute rewrite task","successCheck":"how the student knows it improved"},"personalizedDrill":{"title":"short drill name","instruction":"10-minute exercise","example":"short worked example under 30 words"},"topicRelevantUnusedAWL":[{"word":"policy","reason":"fits the topic"}],"annotations":[{"sentence":"EXACT sentence copied from essay","tag":"strong|improve|error","comment":"under 15 words"}]}`;
}

function writingGenerationQualityRules(taskType) {
  if (taskType==="task2") {
    return `Make the Task 2 question realistic for IELTS Academic: answerable in 40 minutes, not overly broad, and with a clear question type.
Include hidden assessment fields: requirements, planningHints, commonTrap, expectedPositionOptions, and band7MustDo.
Avoid copyrighted or official IELTS/Cambridge wording. Generate an original IELTS-style question.`;
  }
  return `Make the Task 1 data realistic for IELTS Academic: clear main trend, one secondary trend, one exception or contrast, and enough data for comparisons.
Include hidden assessment fields: keyFeatures, expectedOverview, mustMention, commonTrap, and band7MustDo.
Avoid copyrighted or official IELTS/Cambridge wording. Generate original IELTS-style data.`;
}

function WritingExaminerPanels({result,taskType}) {
  if (!result) return null;
  const confidence = result.confidence || examinerScoreSummary(result, taskType);
  const criteria = writingCriteria(taskType);
  return <div className="fu">
    <div className="cols-2">
      {confidence&&<div className="card">
        <div className="card-h"><div className="cdot"/>Examiner Double Marking</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          <div><div className="sl">Examiner A</div><div className="sv" style={{color:bandColor(result.examinerA?.overall)}}>{result.examinerA?.overall?.toFixed?.(1)||"-"}</div></div>
          <div><div className="sl">Examiner B</div><div className="sv" style={{color:bandColor(result.examinerB?.overall)}}>{result.examinerB?.overall?.toFixed?.(1)||"-"}</div></div>
          <div><div className="sl">{confidence.label}</div><div className="sv" style={{color:confidence.spread<=.5?"var(--leaf)":confidence.spread<=1?"var(--honey)":"var(--rose)"}}>{confidence.low.toFixed(1)}-{confidence.high.toFixed(1)}</div></div>
        </div>
        <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55}}>{confidence.note}</div>
      </div>}
      <div className="card">
        <div className="card-h"><div className="cdot"/>Band 7 Gap Trainer</div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",marginBottom:5}}>{result.band7GapDrill?.title || "Focused rewrite"}</div>
        <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.55,marginBottom:7}}><strong style={{color:"var(--orchid)"}}>Target:</strong> {result.band7GapDrill?.targetCriterion || "weakest criterion"}</div>
        <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6}}>{result.band7GapDrill?.instruction}</div>
        {result.band7GapDrill?.successCheck&&<div style={{fontSize:11.5,color:"var(--leaf)",lineHeight:1.55,marginTop:8}}>Success check: {result.band7GapDrill.successCheck}</div>}
      </div>
    </div>
    {result.taskAudit?.length>0&&<div className="card">
      <div className="card-h"><div className="cdot"/>Task Response Audit</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
        {result.taskAudit.map((item,i)=>{
          const color = item.status==="pass" ? "var(--leaf)" : item.status==="fail" ? "var(--rose)" : "var(--honey)";
          return <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:`2px solid ${color}`,borderRadius:8,padding:"9px 10px"}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>{item.status || "review"}</div>
            <div style={{fontSize:12.5,color:"var(--ink)",lineHeight:1.45,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:11.2,color:"var(--ink3)",lineHeight:1.45}}>{item.note}</div>
          </div>;
        })}
      </div>
    </div>}
    <div className="card">
      <div className="card-h"><div className="cdot"/>Why Not Higher?</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {criteria.map(c=><div key={c.k} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:5}}>
            <strong style={{fontSize:12,color:"var(--ink)"}}>{c.full}</strong>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:bandColor(criterionBand(result,c.k))}}>{criterionBand(result,c.k)?.toFixed?.(1)||criterionBand(result,c.k)||"-"}</span>
          </div>
          <div style={{fontSize:11.2,color:"var(--ink3)",lineHeight:1.5}}>{result[c.k]?.whyNotHigher || "No higher-band blocker returned."}</div>
        </div>)}
      </div>
    </div>
  </div>;
}
