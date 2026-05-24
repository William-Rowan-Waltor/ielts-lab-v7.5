const TASK2_TYPES = [
  {id:"opinion",label:"Opinion",hint:"State a clear position and defend it."},
  {id:"discussion",label:"Discussion",hint:"Discuss both views, then give your opinion."},
  {id:"advantages",label:"Advantages / Disadvantages",hint:"Compare benefits and drawbacks clearly."},
  {id:"problem_solution",label:"Problem / Solution",hint:"Explain causes or problems, then practical solutions."},
  {id:"two_part",label:"Two-part",hint:"Answer both questions with balanced depth."}
];

function Task2Page({state,setState,config,embedded=false}) {
  const savedDraft = state.writingDrafts?.task2 || {};
  const [tab,setTab] = useState(()=>savedDraft.tab || "question");
  const [taskType,setTaskType] = useState(()=>savedDraft.taskType || "opinion");
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [question,setQuestion] = useState(()=>savedDraft.question || null);
  const [promptMode,setPromptMode] = useState(()=>savedDraft.promptMode || "generated");
  const [ownPrompt,setOwnPrompt] = useState(()=>savedDraft.ownPrompt || "");
  const [essay,setEssay] = useState(()=>savedDraft.essay || "");
  const [plan,setPlan] = useState(()=>savedDraft.plan || "");
  const [genLoading,setGenLoading] = useState(false);
  const [gradeLoading,setGradeLoading] = useState(false);
  const [gradeResult,setGradeResult] = useState(()=>savedDraft.gradeResult || null);
  const [vocabInsights,setVocabInsights] = useState(()=>savedDraft.vocabInsights || null);
  const [saveMsg,setSaveMsg] = useState("");
  const [showAnnotations,setShowAnnotations] = useState(true);
  const [expandedId,setExpandedId] = useState(null);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const task2Essays = (state.essays||[]).filter(e=>e.taskType==="task2");
  const selectedType = TASK2_TYPES.find(t=>t.id===taskType) || TASK2_TYPES[0];
  const targetBand = state.targetBand || 7.0;
  const promptText = promptMode==="generated" ? (question?.prompt || "") : ownPrompt;

  useEffect(()=>{
    setState(s => ({
      ...s,
      writingDrafts: {
        ...(s.writingDrafts || {}),
        task2: {
          tab,
          taskType,
          difficulty,
          question,
          promptMode,
          ownPrompt,
          essay,
          plan,
          gradeResult,
          vocabInsights,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  },[tab,taskType,difficulty,question,promptMode,ownPrompt,essay,plan,gradeResult,vocabInsights]);

  const typeLabel = (id) => (TASK2_TYPES.find(t=>t.id===id)?.label || id || "Task 2");

  const makeTask2Entry = (gradeResultArg=null, vocabInsightsArg=null) => {
    const now = Date.now();
    return {
      id: now.toString(36) + Math.random().toString(36).slice(2,7),
      taskType:"task2",
      task2Type: promptMode==="generated" ? (question?.type || taskType) : "own",
      savedAt: new Date(now).toISOString(),
      date: TODAY(),
      promptText,
      questionData: promptMode==="generated" ? (question || null) : null,
      plan,
      essay,
      wordCount,
      gradeResult: gradeResultArg,
      vocabInsights: vocabInsightsArg,
      feedbackStyle: state.feedbackStyle || "coach",
      isDraft: !gradeResultArg,
      revisitDue: null,
      revisitedAt: null,
      revisitedFromId: null
    };
  };

  const saveCurrentEssay = (gradeResultArg=gradeResult, vocabInsightsArg=vocabInsights, auto=false) => {
    if (!essay.trim() || wordCount < 20) {
      if (!auto) setSaveMsg("Too short to save. Write at least 20 words.");
      return null;
    }
    const entry = makeTask2Entry(gradeResultArg || null, vocabInsightsArg || null);
    setState(s=>({...s, essays:[entry, ...(s.essays||[])]}));
    setSaveMsg(auto ? `Auto-saved Task 2 (${entry.wordCount} words).` : (gradeResultArg ? "Saved Task 2 with grade." : "Saved Task 2 draft."));
    setTimeout(()=>setSaveMsg(""),3500);
    return entry;
  };

  const generateQuestion = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    setGenLoading(true); setQuestion(null); setGradeResult(null); setVocabInsights(null);
    const goalContext = [
      `Target Band ${targetBand}.`,
      state.writingGoal ? `Student writing goal: ${state.writingGoal}` : null,
      state.examDate ? `Exam date: ${state.examDate}` : null
    ].filter(Boolean).join(" ");
    const prompt = `Create one IELTS Academic Writing Task 2 practice question.
Question type: ${selectedType.label} (${selectedType.hint})
Difficulty: Band ${difficulty}
Student context: ${goalContext || "none"}
Quality rules: ${writingGenerationQualityRules("task2")}

Return ONLY valid JSON, no markdown:
{
  "type":"${taskType}",
  "topic":"specific topic area",
  "prompt":"full IELTS Task 2 question, including 'Give reasons for your answer and include any relevant examples...'",
  "requirements":["what the answer must do","second requirement","third requirement"],
  "planningHints":["paragraph 1 focus","paragraph 2 focus","position or example hint"],
  "commonTrap":"one likely mistake students make with this question",
  "expectedPositionOptions":["reasonable position 1","reasonable position 2"],
  "band7MustDo":["answer every part","clear position throughout","develop main ideas with examples"]
}

Make the question realistic, not too broad, and suitable for a 250+ word essay in 40 minutes.`;
    try {
      const raw = await callAPI(config,[{role:"user",content:prompt}],1200);
      const data = safeJSON(raw);
      data.type = data.type || taskType;
      if (!Array.isArray(data.requirements)) data.requirements = [];
      if (!Array.isArray(data.planningHints)) data.planningHints = [];
      setQuestion(data);
      setPromptMode("generated");
    } catch(e) { alert("Question error: "+e.message); }
    finally { setGenLoading(false); }
  };

  const gradeEssay = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (!promptText.trim()) { alert("Add or generate a Task 2 question first."); return; }
    if (wordCount < 120) { alert("Task 2 grading needs at least 120 words. Aim for 250+."); return; }
    setGradeLoading(true); setGradeResult(null); setVocabInsights(null);
    const styleMap = {
      coach: "FEEDBACK STYLE = COACH. Encouraging but precise. Explain why each fix matters and give concrete next actions.",
      direct: "FEEDBACK STYLE = DIRECT. Terse, specific, no filler praise. State what to fix.",
      examiner: "FEEDBACK STYLE = EXAMINER. Formal IELTS band-descriptor language, evidence-based and dispassionate."
    };
    const styleInstr = styleMap[state.feedbackStyle||"coach"] || styleMap.coach;
    const masteredAWL = Object.entries(state.mastery||{}).filter(([_,m])=>m>=2).map(([w])=>w).slice(0,80);
    const wordDebtInstr = masteredAWL.length >= 3
      ? `\nUSER MASTERED AWL SAMPLE: ${masteredAWL.join(", ")}\nRecommend 3-5 topic-relevant mastered AWL words that would fit this essay but were not used. Return empty array if none fit.`
      : "\nUser has not mastered enough AWL vocabulary. Return topicRelevantUnusedAWL as an empty array.";
    const sys = `You are an expert IELTS examiner. Grade using IELTS Writing Task 2 public band-descriptor concepts.
Score each criterion 5.0-9.0 using half-bands. Overall = average of TR, CC, LR, GRA rounded to the nearest 0.5.

${styleInstr}${wordDebtInstr}

${writingExaminerPromptAddendum("task2")}

Annotation rules: choose 4-8 useful sentences. Copy each sentence verbatim from the essay so highlighting works.`;
    try {
      const raw = await callAPI(config,[
        {role:"system",content:sys},
        {role:"user",content:`TASK 2 QUESTION TYPE: ${typeLabel(question?.type || taskType)}\nQUESTION:\n${promptText}\nQUESTION REQUIREMENTS / HIDDEN CHECKLIST:\n${question ? JSON.stringify({requirements:question.requirements,commonTrap:question.commonTrap,expectedPositionOptions:question.expectedPositionOptions,band7MustDo:question.band7MustDo}) : "none"}\n\nESSAY (${wordCount} words):\n${essay}`}
      ],3800);
      const result = normalizeWritingExaminerResult(safeJSON(raw),"task2",essay);
      setGradeResult(result);
      const historyEntry = {date:TODAY(),taskType:"task2",questionType:question?.type||taskType,overall:result.overall,tr:result.tr.band,ta:result.tr.band,cc:result.cc.band,lr:result.lr.band,gra:result.gra.band};
      setState(s=>({...s, bandHistory:[...(s.bandHistory||[]), historyEntry]}));
      const awlFound = extractAWLFromEssay(essay);
      const insights = buildVocabInsights(awlFound, state.mastery, result.lr.band);
      setVocabInsights(insights);
      saveCurrentEssay(result, insights, true);
    } catch(e) { alert("Grading error: "+e.message); }
    finally { setGradeLoading(false); }
  };

  const loadEntry = (entry) => {
    setQuestion(entry.questionData || null);
    setPromptMode(entry.questionData ? "generated" : "own");
    setOwnPrompt(entry.questionData ? "" : (entry.promptText || ""));
    setEssay(entry.essay || "");
    setPlan(entry.plan || "");
    setGradeResult(entry.gradeResult || null);
    setVocabInsights(entry.vocabInsights || null);
    setTaskType(entry.task2Type && entry.task2Type!=="own" ? entry.task2Type : "opinion");
    setTab("write");
    setSaveMsg(`Loaded Task 2 essay from ${entry.date}.`);
    setTimeout(()=>setSaveMsg(""),3000);
  };

  const deleteEntry = (id) => {
    if (!window.confirm("Delete this Task 2 essay from archive?")) return;
    setState(s=>({...s, essays:(s.essays||[]).filter(e=>e.id!==id)}));
    if (expandedId===id) setExpandedId(null);
  };

  const exportTask2 = () => {
    if (!task2Essays.length) return;
    const blob = new Blob([JSON.stringify(task2Essays,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ielts-task2-essays-${TODAY()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderGrade = (result=gradeResult) => {
    if (!result) return null;
    const criteria = [
      {k:"tr",n:"Task Response"},
      {k:"cc",n:"Coherence & Cohesion"},
      {k:"lr",n:"Lexical Resource"},
      {k:"gra",n:"Grammar Range & Accuracy"}
    ];
    return <div className="fu">
      <div className="card mb14">
        <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
          <div className="overall-big" style={{color:bandColor(result.overall)}}>{result.overall?.toFixed?.(1)||result.overall}</div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>IELTS Writing Task 2 - Overall Band</div>
            <div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6,fontWeight:300,maxWidth:540}}>{result.overallComment}</div>
          </div>
        </div>
      </div>
      <div className="crit-grid">
        {criteria.map(({k,n})=>{
          const d = result[k] || (k==="tr" ? result.ta : null);
          if (!d) return null;
          return <div key={k} className="crit">
            <div className="crit-name">{n}</div>
            <div className="crit-band" style={{color:bandColor(d.band)}}>{d.band?.toFixed?.(1)||d.band}</div>
            <div className="crit-sub">
              {d.strengths?.length>0&&<div><div className="crit-tag" style={{color:"var(--leaf)"}}>Strengths</div><ul>{d.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
              {d.weaknesses?.length>0&&<div><div className="crit-tag" style={{color:"var(--orchid)"}}>Improve</div><ul>{d.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
            </div>
          </div>;
        })}
      </div>
      <div className="cols-2">
        <div className="insight-box win"><div className="insight-h" style={{color:"var(--leaf)"}}>Top Strength</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{result.topStrength}</p></div>
        <div className="insight-box fix"><div className="insight-h" style={{color:"var(--orchid)"}}>Top Priority</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{result.topPriority}</p></div>
      </div>
      <WritingExaminerPanels result={result} taskType="task2"/>
      {(result.thesisCheck||result.ideaDevelopment)&&<div className="card mb14">
        <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Task 2 Checks</div>
        <div className="cols-2" style={{marginBottom:0}}>
          <div><div className="sl">Thesis</div><div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6}}>{result.thesisCheck||"-"}</div></div>
          <div><div className="sl">Idea Development</div><div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6}}>{result.ideaDevelopment||"-"}</div></div>
        </div>
      </div>}
      {result.personalizedDrill&&<div style={{background:"linear-gradient(135deg,rgba(192,132,252,0.10),rgba(163,230,53,0.08))",border:"1px solid var(--border)",borderRadius:12,padding:16,marginTop:14}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",textTransform:"uppercase",marginBottom:8}}>Personalized Drill {result.personalizedDrill.title?`- ${result.personalizedDrill.title}`:""}</div>
        {result.personalizedDrill.instruction&&<div style={{fontSize:13,color:"var(--ink)",lineHeight:1.6,marginBottom:8}}>{result.personalizedDrill.instruction}</div>}
        {result.personalizedDrill.example&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55,paddingTop:8,borderTop:"1px dashed var(--border)",fontStyle:"italic"}}>{result.personalizedDrill.example}</div>}
      </div>}
      {result.annotations&&result.annotations.length>0&&<div className="card" style={{marginTop:14}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:10}}>
          <div className="card-h" style={{margin:0}}><div className="cdot" style={{background:"var(--sky)"}}/>Line-by-line Feedback</div>
          <div style={{display:"flex",gap:5}}>
            <button className={`btn ${showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(true)}>Highlighted</button>
            <button className={`btn ${!showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(false)}>Plain</button>
          </div>
        </div>
        <div style={{background:"#060608",borderRadius:8,padding:"14px 16px",border:"1px solid var(--border)"}}>
          <AnnotatedEssay essay={essay} annotations={result.annotations} showAnnotations={showAnnotations}/>
        </div>
      </div>}
      {result.topicRelevantUnusedAWL&&result.topicRelevantUnusedAWL.length>0&&<WordDebtPanel items={result.topicRelevantUnusedAWL} state={state} setState={setState}/>}
      {vocabInsights&&<VocabInsightsPanel insights={vocabInsights} state={state} setState={setState}/>}
    </div>;
  };

  return <div className={embedded?"fu":"canvas fu"}>
    {!embedded&&<>
      <div className="kicker">AI Tools - Task 2</div>
      <h1 className="title-x">Task 2 <em>Writing</em></h1>
    </>}
    <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",gap:14,flexWrap:"wrap",fontSize:12}}>
      <span><span style={{color:"var(--ink3)"}}>Target</span> <strong>Band {targetBand}</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Word target</span> <strong>250+</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Time</span> <strong>40 min</strong></span>
      <span><span style={{color:"var(--ink3)"}}>Saved</span> <strong>{task2Essays.length}</strong></span>
    </div>
    <div className="mode-toggle">
      <button className={`mode-btn ${tab==="question"?"active":""}`} onClick={()=>setTab("question")}>Generate Question</button>
      <button className={`mode-btn ${tab==="write"?"active":""}`} onClick={()=>setTab("write")}>Write & Grade</button>
      <button className={`mode-btn ${tab==="archive"?"active":""}`} onClick={()=>setTab("archive")}>Task 2 Archive {task2Essays.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({task2Essays.length})</span>}</button>
    </div>
    {saveMsg&&<div className="alert ai mb14" style={{marginTop:-4}}>{saveMsg}</div>}

    {tab==="question"&&<div className="fu">
      <div className="card mb14">
        <div className="row-f">
          <div className="field"><div className="field-label">Question Type</div><select value={taskType} onChange={e=>setTaskType(e.target.value)}>{TASK2_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div className="field"><div className="field-label">Difficulty</div><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
          <button className="btn bp" onClick={generateQuestion} disabled={genLoading}>{genLoading?<><Spinner/> Generating...</>:"Generate"}</button>
        </div>
        <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.6,marginTop:10}}>{selectedType.hint}</div>
      </div>
      {!config&&<div className="alert aw">No AI configured. Add an API key in Settings.</div>}
      {question&&<div className="card">
        <div className="card-h"><div className="cdot"/>Generated Task 2 Question - {typeLabel(question.type)}</div>
        <div className="prompt-box">{question.prompt}</div>
        <div className="kf-grid">
          {(question.requirements||[]).map((k,i)=><div className="kf" key={i}>{k}</div>)}
        </div>
        {question.planningHints?.length>0&&<div className="card" style={{background:"var(--surface2)",marginBottom:12}}>
          <div className="card-h"><div className="cdot" style={{background:"var(--sky)"}}/>Planning Hints</div>
          <ul style={{margin:"0 0 0 18px",padding:0,color:"var(--ink2)",fontSize:12,lineHeight:1.7}}>{question.planningHints.map((h,i)=><li key={i}>{h}</li>)}</ul>
        </div>}
        {question.commonTrap&&<div className="alert aw" style={{marginBottom:12}}>Common trap: {question.commonTrap}</div>}
        <button className="btn bs" onClick={()=>setTab("write")}>Write essay with this question</button>
      </div>}
    </div>}

    {tab==="write"&&<div className="fu">
      {!config&&<div className="alert aw mb14">No AI configured. Go to Settings to add an API key.</div>}
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Your Task 2 Essay</div>
        <div className="mode-toggle" style={{marginBottom:12}}>
          <button className={`mode-btn ${promptMode==="generated"?"active":""}`} onClick={()=>setPromptMode("generated")}>Use Generated Question</button>
          <button className={`mode-btn ${promptMode==="own"?"active":""}`} onClick={()=>setPromptMode("own")}>My Own Question</button>
        </div>
        {promptMode==="generated"&&<div className="alert ai" style={{marginBottom:12}}>{question?`Using: ${question.prompt?.slice(0,110)}...`:"No generated Task 2 question yet. Generate one first, or switch to My Own Question."}</div>}
        {promptMode==="own"&&<div className="field"><div className="field-label">Task 2 Question</div><textarea value={ownPrompt} onChange={e=>setOwnPrompt(e.target.value)} placeholder="Paste your IELTS Writing Task 2 question here..." style={{minHeight:90}}/></div>}
        <div className="field"><div className="field-label">Planning notes</div><textarea value={plan} onChange={e=>setPlan(e.target.value)} placeholder="Plan thesis, body idea 1 + example, body idea 2 + example, conclusion..." style={{minHeight:100}}/></div>
        <textarea value={essay} onChange={e=>setEssay(e.target.value)} placeholder="Write or paste your IELTS Writing Task 2 essay here... Aim for 250+ words." style={{minHeight:260}}/>
        <div className="word-count-bar" style={{color:wordCount>=250?"var(--leaf)":wordCount>=200?"var(--honey)":"var(--rose)"}}>{wordCount} words{wordCount>0&&wordCount<250?` (need ${250-wordCount} more for exam target)`:""}</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button className="btn bp" onClick={gradeEssay} disabled={gradeLoading||!config}>{gradeLoading?<><Spinner/> Grading...</>:"Grade Task 2"}</button>
          <button className="btn bs" onClick={()=>saveCurrentEssay(gradeResult, vocabInsights, false)} disabled={wordCount<20}>Save{gradeResult?" with grade":" draft"}</button>
          {task2Essays.length>0&&<span style={{fontSize:11,color:"var(--ink3)",marginLeft:"auto"}}>{task2Essays.length} Task 2 saved - <span onClick={()=>setTab("archive")} style={{cursor:"pointer",textDecoration:"underline"}}>view archive</span></span>}
        </div>
      </div>
      {gradeResult&&renderGrade(gradeResult)}
    </div>}

    {tab==="archive"&&<div className="fu">
      {task2Essays.length===0
        ? <div className="empty"><div className="empty-icon">T2</div><div style={{fontSize:13,marginBottom:6}}>No Task 2 essays saved yet.</div><div style={{fontSize:11,color:"var(--ink3)"}}>Grade or save a Task 2 essay to build your archive.</div></div>
        : <>
          <div className="card mb14">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
              <div className="card-h" style={{margin:0}}><div className="cdot"/>Task 2 Archive - {task2Essays.length} essays</div>
              <button className="btn bg bsm" onClick={exportTask2}>Export JSON</button>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {task2Essays.map(e=>{
              const open = expandedId===e.id;
              const band = e.gradeResult?.overall;
              return <div key={e.id} className="card" style={{padding:0,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",borderBottom:open?"1px solid var(--border)":"none"}} onClick={()=>setExpandedId(open?null:e.id)}>
                  <div style={{width:44,textAlign:"center",flexShrink:0}}>{band!=null?<div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:bandColor(band),lineHeight:1}}>{band.toFixed(1)}</div>:<div style={{fontSize:13,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>DRAFT</div>}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:3}}><span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink2)"}}>{e.date}</span><span className="chip cs" style={{fontSize:9,padding:"1px 7px"}}>{typeLabel(e.task2Type)}</span><span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{e.wordCount}w</span>{!e.gradeResult&&<span className="chip ch" style={{fontSize:9,padding:"1px 7px"}}>DRAFT</span>}</div>
                    <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.promptText||"No prompt").slice(0,120)}{(e.promptText||"").length>120?"...":""}</div>
                  </div>
                  <div style={{fontSize:14,color:"var(--ink3)"}}>{open?"v":">"}</div>
                </div>
                {open&&<div style={{padding:"14px 16px",background:"var(--surface2)"}}>
                  <div style={{marginBottom:12}}><div className="sl">Question</div><div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55,fontStyle:"italic"}}>{e.promptText}</div></div>
                  <div style={{marginBottom:12}}><div className="sl">Essay - {e.wordCount} words</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap",background:"#060608",borderRadius:8,padding:"12px 14px",border:"1px solid var(--border)"}}>{e.essay}</div></div>
                  {e.gradeResult&&<div style={{marginBottom:12}}>{renderGrade(e.gradeResult)}</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10,borderTop:"1px dashed var(--border)"}}>
                    <button className="btn bs bsm" onClick={()=>loadEntry(e)}>Load to editor</button>
                    <button className="btn bg bsm" onClick={()=>deleteEntry(e.id)} style={{color:"var(--rose)",marginLeft:"auto"}}>Delete</button>
                  </div>
                </div>}
              </div>;
            })}
          </div>
        </>}
    </div>}
  </div>;
}
