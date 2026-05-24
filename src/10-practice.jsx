function Task1PracticePage({state,setState,config,embedded=false}) {
  const savedDraft = state.writingDrafts?.task1 || {};
  const [tab,setTab] = useState(()=>savedDraft.tab || "generate");
  const [chartType,setChartType] = useState(()=>savedDraft.chartType || "line");
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [genLoading,setGenLoading] = useState(false);
  const [genData,setGenData] = useState(()=>savedDraft.genData || null);
  const [essay,setEssay] = useState(()=>savedDraft.essay || "");
  const [plan,setPlan] = useState(()=>savedDraft.plan || "");
  const [gradeMode,setGradeMode] = useState(()=>savedDraft.gradeMode || "generated");
  const [ownPrompt,setOwnPrompt] = useState(()=>savedDraft.ownPrompt || "");
  const [gradeLoading,setGradeLoading] = useState(false);
  const [gradeResult,setGradeResult] = useState(()=>savedDraft.gradeResult || null);
  const [vocabInsights,setVocabInsights] = useState(()=>savedDraft.vocabInsights || null);
  // FEATURE Archive — UI state
  const [saveMsg,setSaveMsg] = useState("");           // transient confirmation toast
  const [expandedEssayId,setExpandedEssayId] = useState(null); // which archive item is open
  const [archiveFilter,setArchiveFilter] = useState("all"); // "all" | "graded" | "draft" | "due"
  // V6: Revision Queue — track which essay this new attempt is revising (null if not a revisit)
  const [revisitOf,setRevisitOf] = useState(()=>savedDraft.revisitOf || null);
  // V6: Sentence-annotations UI
  const [showAnnotations,setShowAnnotations] = useState(true);
  const wordCount = essay.trim().split(/\s+/).filter(w=>w).length;
  const essays = (state.essays || []).filter(e => (e.taskType || "task1") === "task1");

  useEffect(()=>{
    setState(s => ({
      ...s,
      writingDrafts: {
        ...(s.writingDrafts || {}),
        task1: {
          tab,
          chartType,
          difficulty,
          genData,
          essay,
          plan,
          gradeMode,
          ownPrompt,
          gradeResult,
          vocabInsights,
          revisitOf,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  },[tab,chartType,difficulty,genData,essay,plan,gradeMode,ownPrompt,gradeResult,vocabInsights,revisitOf]);

  // FEATURE Archive — build a single entry from current Practice state
  // V6: Revision Queue — graded essays get revisitDue (savedAt + 7 days).
  //                      If this essay is itself a revisit, link to original via revisitedFromId.
  const REVISIT_INTERVAL_MS = 7 * DAY_MS;
  const buildEssayEntry = (gradeResultArg, vocabInsightsArg) => {
    const promptText = gradeMode==="generated"
      ? (genData?.prompt || "")
      : (ownPrompt || "");
    const now = Date.now();
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      savedAt: new Date(now).toISOString(),
      date: TODAY(),
      promptText,
      chartType: gradeMode==="generated" ? (genData?.chartType||null) : null,
      genData: gradeMode==="generated" ? (genData||null) : null,
      plan,
      essay,
      wordCount,
      gradeResult: gradeResultArg || null,
      vocabInsights: vocabInsightsArg || null,
      feedbackStyle: state.feedbackStyle || "coach",
      isDraft: !gradeResultArg,
      // V6: revisit metadata — only graded essays get scheduled
      revisitDue: gradeResultArg ? (now + REVISIT_INTERVAL_MS) : null,
      revisitedAt: null,                 // set when user starts a revisit session
      taskType: "task1",
      revisitedFromId: revisitOf || null // set when this entry is itself a revisit child
    };
  };

  const saveCurrentEssay = (gradeResultArg=null, vocabInsightsArg=null, auto=false) => {
    if (!essay.trim() || wordCount < 10) {
      if (!auto) setSaveMsg("⚠ Bài viết quá ngắn để lưu (tối thiểu 10 từ).");
      return;
    }
    const entry = buildEssayEntry(gradeResultArg, vocabInsightsArg);
    setState(s => ({...s, essays: [entry, ...(s.essays||[])]}));
    setSaveMsg(auto
      ? `✓ Auto-saved sau khi chấm (${entry.wordCount} từ).`
      : (gradeResultArg ? `✓ Đã lưu bài cùng kết quả chấm.` : `✓ Đã lưu draft (chưa chấm).`));
    setTimeout(()=>setSaveMsg(""), 3500);
  };

  const deleteEssay = (id) => {
    if (!window.confirm("Xoá bài này khỏi archive? Không thể khôi phục.")) return;
    setState(s => ({...s, essays: (s.essays||[]).filter(e=>e.id!==id)}));
    if (expandedEssayId===id) setExpandedEssayId(null);
  };

  const loadEssayToEditor = (entry) => {
    setEssay(entry.essay);
    setPlan(entry.plan || "");
    if (entry.genData) { setGenData(entry.genData); setGradeMode("generated"); }
    else if (entry.promptText) { setOwnPrompt(entry.promptText); setGradeMode("own"); }
    setGradeResult(entry.gradeResult || null);
    setVocabInsights(entry.vocabInsights || null);
    setRevisitOf(null); // loading is editing, not revising
    setTab("grade");
    setSaveMsg(`↻ Đã load bài "${entry.date}" vào editor.`);
    setTimeout(()=>setSaveMsg(""), 3500);
  };

  // V6: Revision Queue — load ONLY the prompt (not the old essay) and mark this as a revisit.
  // The pedagogical point: rewrite blind, then compare scores afterwards.
  const startRevisit = (entry) => {
    setEssay(""); // blank canvas — critical
    if (entry.genData) { setGenData(entry.genData); setGradeMode("generated"); }
    else if (entry.promptText) { setOwnPrompt(entry.promptText); setGradeMode("own"); }
    setGradeResult(null);
    setVocabInsights(null);
    setRevisitOf(entry.id);
    setTab("grade");
    setSaveMsg(`🔁 Revising "${entry.date}" · Band ${entry.gradeResult?.overall?.toFixed?.(1)||"?"} → write fresh, then compare.`);
    setTimeout(()=>setSaveMsg(""), 5000);
  };

  // Mark a parent essay as revisited (called when its child is graded)
  const markRevisited = (parentId) => {
    setState(s => ({...s, essays: (s.essays||[]).map(e => e.id===parentId ? {...e, revisitedAt: new Date().toISOString()} : e)}));
  };

  const copyEssayToClipboard = async (entry) => {
    const lines = [];
    lines.push(`# IELTS Writing Task 1 — ${entry.date}`);
    if (entry.promptText) lines.push(`\n## Question\n${entry.promptText}`);
    lines.push(`\n## Essay (${entry.wordCount} words)\n${entry.essay}`);
    if (entry.gradeResult) {
      const g = entry.gradeResult;
      lines.push(`\n## Grade\nOverall: Band ${g.overall?.toFixed?.(1)||g.overall}`);
      lines.push(`TA: ${g.ta?.band} · CC: ${g.cc?.band} · LR: ${g.lr?.band} · GRA: ${g.gra?.band}`);
      if (g.overallComment) lines.push(`\n${g.overallComment}`);
      if (g.topPriority) lines.push(`\nTop priority: ${g.topPriority}`);
      if (g.topStrength) lines.push(`Top strength: ${g.topStrength}`);
    }
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setSaveMsg(`✓ Đã copy bài "${entry.date}" vào clipboard.`);
    } catch {
      setSaveMsg(`⚠ Trình duyệt chặn clipboard. Highlight + Ctrl+C thủ công.`);
    }
    setTimeout(()=>setSaveMsg(""), 3500);
  };

  const exportAllEssays = () => {
    if (essays.length===0) return;
    const blob = new Blob([JSON.stringify(essays,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ielts-essays-${TODAY()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // F3: Auto-derive weakness from recent bandHistory (last 5 attempts)
  const weakness = useMemo(()=>{
    const recent = (state.bandHistory||[]).filter(h => (h.taskType || "task1") === "task1").slice(-5);
    if (recent.length < 2) return null;
    const avg = (k) => recent.reduce((s,r)=>s+(r[k]||0),0)/recent.length;
    const crits = [
      {key:"ta",label:"Task Achievement",avg:avg("ta")},
      {key:"cc",label:"Coherence & Cohesion",avg:avg("cc")},
      {key:"lr",label:"Lexical Resource",avg:avg("lr")},
      {key:"gra",label:"Grammar & Accuracy",avg:avg("gra")}
    ].sort((a,b)=>a.avg-b.avg);
    return crits[0]; // weakest
  },[state.bandHistory]);

  const daysToExam = useMemo(()=>{
    if (!state.examDate) return null;
    return Math.max(0,Math.ceil((new Date(state.examDate)-new Date())/DAY_MS));
  },[state.examDate]);

  const targetBand = state.targetBand||7.0;

  const generateQuestion = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    setGenLoading(true); setGenData(null);
    // F3: Inject user goal context into prompt
    const goalContext = [
      `Targeting Band ${targetBand}.`,
      daysToExam!==null ? `${daysToExam} days until exam.` : null,
      state.writingGoal ? `Student's personal writing goal: "${state.writingGoal}". Choose data that lets them practise this.` : null,
      weakness ? `Student's weakest criterion (recent 5-essay avg): ${weakness.label} = Band ${weakness.avg.toFixed(1)}. Bias the question toward exercising this criterion — e.g. for GRA weakness, choose data requiring complex tense/conditional patterns; for LR weakness, choose data inviting varied vocabulary; for CC weakness, choose data with multiple categories needing clear organisation; for TA weakness, include subtle features that require careful selection of key points.` : null
    ].filter(Boolean).join(" ");

    // F5: Chart-type-specific JSON shape — covers all real IELTS Task 1 visual types
    const shapeSpecs = {
      line:     `"chartData":{"labels":["2010","2012","2014","2016","2018","2020"],"datasets":[{"label":"Category A","data":[25,32,28,45,52,60]},{"label":"Category B","data":[40,38,35,30,28,25]}]}`,
      bar:      `"chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Group A","data":[35,42,58]},{"label":"Group B","data":[28,33,45]}]}`,
      pie:      `"chartData":{"labels":["Category A","Category B","Category C","Category D"],"datasets":[{"label":"Share %","data":[35,25,22,18]}]}`,
      table:    `"chartData":{"headers":["Country","2010","2015","2020"],"rows":[["UK",45,55,68],["Germany",52,61,71],["France",40,48,55],["Italy",38,44,50]]}`,
      mixed:    `"chartDataMultiple":[{"chartType":"bar","caption":"Total volume","chartData":{"labels":["2010","2015","2020"],"datasets":[{"label":"Total","data":[100,135,180]}]}},{"chartType":"pie","caption":"2020 breakdown","chartData":{"labels":["A","B","C"],"datasets":[{"label":"Share","data":[50,30,20]}]}}]`,
      multiple: `"chartDataMultiple":[{"chartType":"pie","caption":"2010","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2010","data":[40,30,20,10]}]}},{"chartType":"pie","caption":"2020","chartData":{"labels":["A","B","C","D"],"datasets":[{"label":"2020","data":[25,35,25,15]}]}}]`,
      process:  `"processSteps":[{"label":"Raw materials","description":"Wood logs are delivered to the factory"},{"label":"Pulping","description":"Logs are ground into pulp using machinery"},{"label":"Bleaching","description":"Pulp is treated with chemicals to whiten"},{"label":"Drying & rolling","description":"Sheets are dried, pressed, and rolled"},{"label":"Packaging","description":"Finished paper is cut and packaged for distribution"}]`,
      map:      `"mapElements":{"before":[{"label":"Park (centre)","desc":"large open green space"},{"label":"Houses (north)","desc":"row of 6 detached houses"},{"label":"Road (east)","desc":"narrow single-lane road"}],"after":[{"label":"Shopping centre","desc":"replaces former park area"},{"label":"Apartments (north)","desc":"houses replaced by 3-storey blocks"},{"label":"Dual carriageway (east)","desc":"road widened to 2 lanes each direction"}]}`
    };
    const typeDescription = {
      line:     "a line graph showing change over time across at least 2 categories",
      bar:      "a bar chart comparing 2-3 categories across 2-4 time points or groups",
      pie:      "a pie chart showing proportional breakdown of 4 categories (sum = 100%)",
      table:    "a data table with 3-5 rows and 3-4 columns of related figures",
      mixed:    "two complementary charts of DIFFERENT types (e.g. bar + pie) on related data",
      multiple: "two charts of the SAME type comparing different time periods or populations",
      process:  "a process diagram with 4-7 sequential stages (manufacturing / natural cycle)",
      map:      "a before/after map comparison showing changes to a place over time"
    };

    const prompt = `Create an IELTS Writing Task 1 practice question. Visual type: ${chartType} (${typeDescription[chartType]||""}). Difficulty: Band ${difficulty}.

USER CONTEXT: ${goalContext}
QUALITY RULES: ${writingGenerationQualityRules("task1")}

Return ONLY valid JSON (no markdown fence):
{
  "prompt":"The ${chartType==="process"?"diagram":chartType==="map"?"maps":chartType} below show${chartType==="map"||chartType==="mixed"||chartType==="multiple"?"":"s"}...",
  "title":"Specific chart title (avoid generic 'Chart Title')",
  "source":"Source: [realistic institution], [year]",
  "chartType":"${chartType}",
  ${shapeSpecs[chartType]||shapeSpecs.line},
  "keyFeatures":["Specific key feature 1 to describe","Key feature 2","Key feature 3"],
  "expectedOverview":"one-sentence overview that a Band 7+ answer should contain",
  "mustMention":["specific comparison or trend","important exception"],
  "commonTrap":"one realistic mistake candidates may make",
  "band7MustDo":["clear overview","select key features","support comparisons with accurate data"]
}

CRITICAL: Use the EXACT JSON shape for chartType="${chartType}" as shown above. Do not return a chartData object if the type uses chartDataMultiple, processSteps, or mapElements.`;
    try {
      const text = await callAPI(config,[{role:"user",content:prompt}],1500);
      const d = safeJSON(text); setGenData(d);
    } catch(e) { alert("Error: "+e.message); }
    finally { setGenLoading(false); }
  };

  const gradeEssay = async () => {
    if (!config) { alert("Set up your AI config in Settings first."); return; }
    if (wordCount < 50) { alert("Please write at least 50 words."); return; }
    setGradeLoading(true); setGradeResult(null); setVocabInsights(null);
    let context = gradeMode==="generated"&&genData
      ? `EXAM QUESTION: ${genData.prompt}\nCHART TYPE: ${genData.chartType}`
      : ownPrompt ? `EXAM QUESTION: ${ownPrompt}` : "No question provided.";
    // F6: Feedback style — adjusts tone of overallComment, strengths, weaknesses, topPriority
    const styleMap = {
      coach: "FEEDBACK STYLE = COACH. Encouraging, analogy-rich, explains the *why* behind each fix. Use Feynman coaching: point out one strength before each weakness, suggest concrete patterns to try. Avoid jargon without unpacking it.",
      direct: "FEEDBACK STYLE = DIRECT. Terse, no praise unless earned, no hedging. State exactly what's wrong in 5–10 words per point. No metaphors. No 'great job' filler.",
      examiner: "FEEDBACK STYLE = EXAMINER. Formal IELTS band-descriptor language. Reference the descriptors explicitly (e.g. 'attempts to use complex structures with mixed accuracy → consistent with Band 6'). Dispassionate, evidence-based."
    };
    const styleInstr = styleMap[state.feedbackStyle||"coach"];
    // F7: Personal writing goal context
    const personalGoal = state.writingGoal ? `\nSTUDENT'S PERSONAL WRITING GOAL: "${state.writingGoal}". Reference this goal when relevant in your assessment.` : "";
    // V6 NEW — Word Debt: build mastered AWL list for the AI to recommend FROM (topic-relevant only)
    // Threshold: mastery >= 2 means "user has seen + practiced this word", not just glanced.
    const masteredAWL = Object.entries(state.mastery||{}).filter(([_,m])=>m>=2).map(([w])=>w);
    // Cap list to keep prompt focused (the AI doesn't need 300 words to recommend 5).
    const masteredSample = masteredAWL.slice(0, 80);
    const wordDebtInstr = masteredAWL.length >= 3
      ? `\n\nUSER'S MASTERED AWL VOCABULARY (mastery ≥ 2, sample of ${masteredSample.length}/${masteredAWL.length}):\n${masteredSample.join(", ")}\n\nFrom this list, identify 3–5 words that WOULD HAVE FIT this essay's topic/context but were NOT used. Skip words that are topically irrelevant. If fewer than 3 fit, return only those that fit. For each, give a one-line reason (vi or en, ≤12 words).`
      : `\n\n(User has not yet mastered enough AWL vocabulary for topic-relevant suggestions. Skip topicRelevantUnusedAWL — return empty array.)`;
    // F8: personalizedDrill — targeted exercise based on essay's specific weakness
    const sys = `You are an expert IELTS examiner. Grade using IELTS Writing Task 1 public band-descriptor concepts.
Score each criterion 5.0-9.0 (half-bands). Overall = average of 4, rounded to 0.5.

${styleInstr}${personalGoal}${wordDebtInstr}

${writingExaminerPromptAddendum("task1")}

ANNOTATIONS rules: Pick 4-8 of the most pedagogically useful sentences (mix of strong + improve + error). Copy each sentence VERBATIM from the essay (no paraphrasing - exact match for highlight to work). Comment must be a specific, actionable reason. Skip sentences that are merely average.`;
    try {
      const raw = await callAPI(config,[{role:"system",content:sys},{role:"user",content:`${context}\nEXPECTED OVERVIEW / KEY FEATURES IF GENERATED:\n${genData ? JSON.stringify({expectedOverview:genData.expectedOverview,mustMention:genData.mustMention,commonTrap:genData.commonTrap,band7MustDo:genData.band7MustDo}) : "none"}\n\nESSAY (${wordCount} words):\n${essay}`}],3600);
      const result = normalizeWritingExaminerResult(safeJSON(raw),"task1",essay);
      setGradeResult(result);
      // Save band history (functional setState — gradeEssay runs after await)
      const entry = {date:TODAY(),taskType:"task1",overall:result.overall,ta:result.ta.band,cc:result.cc.band,lr:result.lr.band,gra:result.gra.band};
      setState(s => ({...s, bandHistory: [...s.bandHistory, entry]}));
      // Vocab bridge (C) — detect AWL words & build insights
      const awlFound = extractAWLFromEssay(essay);
      const insights = buildVocabInsights(awlFound, state.mastery, result.lr.band);
      setVocabInsights(insights);
      // FEATURE Archive: auto-save graded essay so user has a permanent record
      saveCurrentEssay(result, insights, true);
      // V6: if this was a revisit, mark the parent as revisited
      if (revisitOf) {
        markRevisited(revisitOf);
      }
    } catch(e) { alert("Grading error: "+e.message); }
    finally { setGradeLoading(false); }
  };

  return <div className={embedded?"fu":"canvas fu"}>
    {!embedded&&<>
      <div className="kicker">AI Tools - Writing</div>
      <h1 className="title-x">Writing & <em>Grade</em></h1>
    </>}
    {(weakness||daysToExam!==null||state.writingGoal)&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",flexDirection:"column",gap:8,fontSize:12}}>
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{color:"var(--orchid)"}}>🎯</span><span style={{color:"var(--ink3)"}}>Target</span> <strong style={{color:"var(--ink)"}}>Band {targetBand}</strong></span>
        {daysToExam!==null&&<span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{color:"var(--ink3)"}}>·</span><span style={{color:"var(--ink3)"}}>{daysToExam} days left</span></span>}
        {weakness&&<span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{color:"var(--ink3)"}}>·</span><span style={{color:"var(--ink3)"}}>Weakest:</span> <strong style={{color:"var(--rose)"}}>{weakness.label}</strong> <span style={{color:"var(--ink3)"}}>({weakness.avg.toFixed(1)})</span></span>}
        <span style={{display:"inline-flex",alignItems:"center",gap:5,marginLeft:"auto"}}><span style={{color:"var(--ink3)"}}>Style:</span> <strong style={{color:"var(--sky)"}}>{({coach:"🎯 Coach",direct:"⚡ Direct",examiner:"📋 Examiner"})[state.feedbackStyle||"coach"]}</strong></span>
      </div>
      {state.writingGoal&&<div style={{fontSize:11,color:"var(--ink3)",fontStyle:"italic",paddingTop:6,borderTop:"1px dashed var(--border)"}}>📝 Goal: "{state.writingGoal}"</div>}
    </div>}
    <div className="mode-toggle">
      <button className={`mode-btn ${tab==="generate"?"active":""}`} onClick={()=>setTab("generate")}>✦ Generate Question</button>
      <button className={`mode-btn ${tab==="grade"?"active":""}`} onClick={()=>setTab("grade")}>📝 Grade Essay</button>
      <button className={`mode-btn ${tab==="archive"?"active":""}`} onClick={()=>setTab("archive")}>📚 Archive {essays.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({essays.length})</span>}</button>
    </div>
    {saveMsg&&<div className={`alert ${saveMsg.startsWith("✓")?"ag":saveMsg.startsWith("⚠")?"aw":"ai"} mb14`} style={{marginTop:-4}}>{saveMsg}</div>}

    {tab==="generate"&&<div className="fu">
      <div className="card mb14">
        <div className="row-f">
          <div className="field">
            <div className="field-label">Visual Type</div>
            <select value={chartType} onChange={e=>setChartType(e.target.value)}>
              <optgroup label="Data-driven">
                <option value="line">📈 Line Chart</option>
                <option value="bar">📊 Bar Chart</option>
                <option value="pie">🥧 Pie Chart</option>
                <option value="table">🗂 Table</option>
              </optgroup>
              <optgroup label="Multi-visual">
                <option value="mixed">🔀 Mixed (2 different types)</option>
                <option value="multiple">📊📊 Multiple (same type ×2)</option>
              </optgroup>
              <optgroup label="Diagrams">
                <option value="process">⚙️ Process Diagram</option>
                <option value="map">🗺 Map (before/after)</option>
              </optgroup>
            </select>
          </div>
          <div className="field">
            <div className="field-label">Target Band</div>
            <select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
              <option value="6.5">Band 6.5</option><option value="7.0">Band 7.0</option><option value="7.5">Band 7.5</option>
            </select>
          </div>
          <button className="btn bp" onClick={generateQuestion} disabled={genLoading}>{genLoading?<><Spinner/> Generating...</>:"✦ Generate"}</button>
        </div>
      </div>
      {!config&&<div className="alert aw">⚠ No AI configured. Add an API key in Settings.</div>}
      {genData&&<div className="fu">
        <div className="chart-box">
          <div style={{marginBottom:10}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)",lineHeight:1.3}}>{genData.title}</div>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)",marginTop:2}}>{genData.source}</div>
          </div>
          {genData.chartData||genData.chartDataMultiple||genData.processSteps||genData.mapElements
            ? <PracticeVisualRender genData={genData}/>
            : null}
        </div>
        <div className="prompt-box">{genData.prompt}</div>
        {genData.keyFeatures&&<div>
          <div className="card-h mb8"><div className="cdot" style={{background:"var(--rose)"}}/>Key Features to Describe</div>
          <div className="kf-grid">
            {genData.keyFeatures.map((f,i)=><div key={i} className="kf"><strong>Feature {i+1}</strong>{f}</div>)}
          </div>
        </div>}
        <button className="btn bs" onClick={()=>setTab("grade")}>→ Write Essay with This Question</button>
      </div>}
    </div>}

    {tab==="grade"&&<div className="fu">
      {!config&&<div className="alert aw mb14">⚠ No AI configured. Go to Settings to add an API key.</div>}
      {/* V6: Revisit Banner — show context when user is revising an old essay */}
      {revisitOf && (() => {
        const parent = essays.find(e => e.id === revisitOf);
        if (!parent) return null;
        return <div style={{background:"linear-gradient(135deg,rgba(192,132,252,.10),rgba(96,165,250,.08))",border:"1px solid var(--border)",borderLeft:"2px solid var(--orchid)",borderRadius:10,padding:"11px 14px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",textTransform:"uppercase"}}>🔁 Revision Mode</div>
            <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.5,flex:1,minWidth:200}}>
              Revising your <strong style={{color:"var(--ink)"}}>{parent.date}</strong> attempt — Band <strong style={{color:bandColor(parent.gradeResult?.overall||0)}}>{parent.gradeResult?.overall?.toFixed?.(1)||"?"}</strong>. Write fresh, then we'll compare.
            </div>
            <button className="btn bg bsm" onClick={()=>{setRevisitOf(null);setSaveMsg("");}}>✕ Exit revision</button>
          </div>
        </div>;
      })()}
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Your Essay</div>
        <div className="mode-toggle" style={{marginBottom:12}}>
          <button className={`mode-btn ${gradeMode==="generated"?"active":""}`} onClick={()=>setGradeMode("generated")}>📄 Use Generated Question</button>
          <button className={`mode-btn ${gradeMode==="own"?"active":""}`} onClick={()=>setGradeMode("own")}>✏ My Own Question</button>
        </div>
        {gradeMode==="generated"&&<div className="alert ai" style={{marginBottom:12}}>{genData?`Using: ${genData.prompt?.slice(0,80)}...`:"No question generated yet — generate one first, or switch to 'My Own'."}</div>}
        {gradeMode==="own"&&<div className="field"><div className="field-label">Your Question / Prompt</div><textarea value={ownPrompt} onChange={e=>setOwnPrompt(e.target.value)} placeholder="Paste your IELTS Task 1 question here..." style={{minHeight:80}}/></div>}
        <div className="field"><div className="field-label">Planning notes</div><textarea value={plan} onChange={e=>setPlan(e.target.value)} placeholder="Plan the overview, key feature 1, key feature 2, and comparisons..." style={{minHeight:90}}/></div>
        <textarea value={essay} onChange={e=>setEssay(e.target.value)} placeholder="Write or paste your IELTS Task 1 essay here... (minimum 150 words)"/>
        <div className="word-count-bar" style={{color:wordCount>=150?"var(--leaf)":wordCount>=100?"var(--honey)":"var(--rose)"}}>{wordCount} words{wordCount>0&&wordCount<150?" (need "+( 150-wordCount)+" more)":""}</div>
        <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button className="btn bp" onClick={gradeEssay} disabled={gradeLoading||!config}>
            {gradeLoading?<><Spinner/> Grading...</>:"✦ Grade Essay"}
          </button>
          <button className="btn bs" onClick={()=>saveCurrentEssay(gradeResult, vocabInsights, false)} disabled={wordCount<10} title="Lưu vào archive — không cần chấm trước">
            💾 Save{gradeResult?" with grade":" draft"}
          </button>
          {essays.length>0&&<span style={{fontSize:11,color:"var(--ink3)",marginLeft:"auto"}}>📚 {essays.length} bài đã lưu · <span onClick={()=>setTab("archive")} style={{cursor:"pointer",textDecoration:"underline"}}>xem archive</span></span>}
        </div>
      </div>

      {gradeResult&&<div className="fu">
        <div className="card mb14">
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div className="overall-big" style={{color:bandColor(gradeResult.overall)}}>{gradeResult.overall.toFixed(1)}</div>
            <div>
              <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".14em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>IELTS Writing Task 1 · Overall Band</div>
              <div style={{fontSize:13,color:"var(--ink2)",lineHeight:1.6,fontWeight:300,maxWidth:400}}>{gradeResult.overallComment}</div>
            </div>
          </div>
        </div>
        <div className="crit-grid">
          {[{k:"ta",n:"Task Achievement"},{k:"cc",n:"Coherence & Cohesion"},{k:"lr",n:"Lexical Resource"},{k:"gra",n:"Grammar Range & Accuracy"}].map(({k,n})=>{
            const d=gradeResult[k]; if(!d) return null;
            return <div key={k} className="crit">
              <div className="crit-name">{n}</div>
              <div className="crit-band" style={{color:bandColor(d.band)}}>{d.band.toFixed(1)}</div>
              <div className="crit-sub">
                {d.strengths?.length>0&&<div><div className="crit-tag" style={{color:"var(--leaf)"}}>✓ Strengths</div><ul>{d.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
                {d.weaknesses?.length>0&&<div><div className="crit-tag" style={{color:"var(--orchid)"}}>⚠ Improve</div><ul>{d.weaknesses.map((s,i)=><li key={i}>{s}</li>)}</ul></div>}
              </div>
            </div>;
          })}
        </div>
        <div className="cols-2">
          <div className="insight-box win"><div className="insight-h" style={{color:"var(--leaf)"}}>Top Strength</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{gradeResult.topStrength}</p></div>
          <div className="insight-box fix"><div className="insight-h" style={{color:"var(--orchid)"}}>Top Priority</div><p style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.6,fontWeight:300}}>{gradeResult.topPriority}</p></div>
        </div>
        <WritingExaminerPanels result={gradeResult} taskType="task1"/>
        {gradeResult.personalizedDrill&&<div style={{background:"linear-gradient(135deg,rgba(192,132,252,0.10),rgba(163,230,53,0.08))",border:"1px solid var(--border)",borderRadius:12,padding:16,marginTop:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",textTransform:"uppercase"}}>🎯 Personalized Drill</span>
            {gradeResult.personalizedDrill.title&&<span style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)",fontWeight:500}}>· {gradeResult.personalizedDrill.title}</span>}
          </div>
          {gradeResult.personalizedDrill.instruction&&<div style={{fontSize:13,color:"var(--ink)",lineHeight:1.6,marginBottom:gradeResult.personalizedDrill.example?9:0}}>{gradeResult.personalizedDrill.instruction}</div>}
          {gradeResult.personalizedDrill.example&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.55,paddingTop:8,borderTop:"1px dashed var(--border)",fontStyle:"italic"}}><span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--leaf)",fontWeight:700,marginRight:6,fontStyle:"normal"}}>EXAMPLE</span>{gradeResult.personalizedDrill.example}</div>}
        </div>}
        {/* V6: Sentence-level Annotations panel */}
        {gradeResult.annotations&&gradeResult.annotations.length>0&&<div className="card" style={{marginTop:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
            <div className="card-h" style={{margin:0}}><div className="cdot" style={{background:"var(--sky)"}}/>Line-by-line Feedback</div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <button className={`btn ${showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(true)}>🎨 Highlighted</button>
              <button className={`btn ${!showAnnotations?"bp":"bg"} bsm`} onClick={()=>setShowAnnotations(false)}>📄 Plain</button>
            </div>
          </div>
          {/* Legend */}
          <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:"var(--ink3)",marginBottom:11,paddingBottom:9,borderBottom:"1px dashed var(--border)"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:14,height:8,background:"rgba(163,230,53,.25)",borderBottom:"2px solid var(--leaf)",borderRadius:2,display:"inline-block"}}/>strong</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:14,height:8,background:"rgba(251,191,36,.25)",borderBottom:"2px solid var(--honey)",borderRadius:2,display:"inline-block"}}/>improve</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:14,height:8,background:"rgba(244,63,94,.25)",borderBottom:"2px solid var(--rose)",borderRadius:2,display:"inline-block"}}/>error</span>
            <span style={{marginLeft:"auto",fontStyle:"italic"}}>Hover any highlight for the reason</span>
          </div>
          <div style={{background:"#060608",borderRadius:8,padding:"14px 16px",border:"1px solid var(--border)"}}>
            <AnnotatedEssay essay={essay} annotations={gradeResult.annotations} showAnnotations={showAnnotations}/>
          </div>
          {/* Comment list as fallback for users who prefer linear reading */}
          <div style={{marginTop:11,display:"flex",flexDirection:"column",gap:5}}>
            {gradeResult.annotations.map((a,i)=>{
              const c = a.tag==="strong"?"var(--leaf)":a.tag==="improve"?"var(--honey)":"var(--rose)";
              const icon = a.tag==="strong"?"✓":a.tag==="improve"?"→":"✗";
              return <div key={i} style={{display:"flex",gap:8,fontSize:11.5,color:"var(--ink3)",lineHeight:1.55,padding:"4px 0"}}>
                <span style={{color:c,fontWeight:700,flexShrink:0,fontFamily:"'Geist Mono',monospace"}}>{icon}</span>
                <span style={{color:"var(--ink2)",fontStyle:"italic",flexShrink:0,maxWidth:"45%",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>"{a.sentence.slice(0,60)}{a.sentence.length>60?"...":""}"</span>
                <span style={{color:c}}>·</span>
                <span style={{color:"var(--ink2)"}}>{a.comment}</span>
              </div>;
            })}
          </div>
        </div>}
        {/* V6: Word Debt — topic-relevant unused mastered words */}
        {gradeResult.topicRelevantUnusedAWL&&gradeResult.topicRelevantUnusedAWL.length>0&&
          <WordDebtPanel items={gradeResult.topicRelevantUnusedAWL} state={state} setState={setState}/>}
        {/* V6: Revisit Comparison — if this was a revisit, show before/after */}
        {revisitOf && (() => {
          const parent = essays.find(e => e.id === revisitOf);
          if (!parent || !parent.gradeResult) return null;
          const prevBand = parent.gradeResult.overall;
          const curBand = gradeResult.overall;
          const delta = curBand - prevBand;
          const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
          const arrowColor = delta > 0 ? "var(--leaf)" : delta < 0 ? "var(--rose)" : "var(--ink3)";
          return <div className="card" style={{marginTop:14,background:"linear-gradient(135deg,rgba(192,132,252,.06),rgba(96,165,250,.05))",borderLeft:"2px solid var(--orchid)"}}>
            <div className="card-h" style={{marginBottom:11}}><div className="cdot" style={{background:"var(--orchid)"}}/>🔁 Revision Comparison · {parent.date} → {TODAY()}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:9}}>
              {[{k:"overall",n:"Overall"},{k:"ta",n:"TA"},{k:"cc",n:"CC"},{k:"lr",n:"LR"},{k:"gra",n:"GRA"}].map(({k,n})=>{
                const prev = k==="overall" ? parent.gradeResult.overall : parent.gradeResult[k]?.band;
                const cur  = k==="overall" ? gradeResult.overall : gradeResult[k]?.band;
                if (prev==null||cur==null) return <div key={k}/>;
                const d = cur-prev;
                const dColor = d>0?"var(--leaf)":d<0?"var(--rose)":"var(--ink3)";
                return <div key={k} style={{background:"var(--surface2)",borderRadius:8,padding:"8px 6px",textAlign:"center",border:"1px solid var(--border)"}}>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",letterSpacing:".06em",marginBottom:3}}>{n}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                    <span style={{fontFamily:"'Fraunces',serif",fontSize:13,color:"var(--ink3)"}}>{prev?.toFixed?.(1)}</span>
                    <span style={{color:dColor,fontSize:10}}>{d>0?"↑":d<0?"↓":"→"}</span>
                    <span style={{fontFamily:"'Fraunces',serif",fontSize:15,color:bandColor(cur),fontWeight:500}}>{cur?.toFixed?.(1)}</span>
                  </div>
                  {d!==0&&<div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:dColor,marginTop:2}}>{d>0?"+":""}{d.toFixed(1)}</div>}
                </div>;
              })}
            </div>
            <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.5}}>
              {delta > 0
                ? <>📈 You improved by <strong style={{color:"var(--leaf)"}}>+{delta.toFixed(1)} band</strong> on the same prompt. What changed in your approach?</>
                : delta < 0
                  ? <>📉 You scored <strong style={{color:"var(--rose)"}}>{delta.toFixed(1)} band</strong> lower than your first attempt — read the original's strengths in archive to see what worked.</>
                  : <>↔ Same band as last attempt. Check the new annotations vs. your old ones to find what to push on next.</>}
            </div>
          </div>;
        })()}
        {/* ✦ VOCAB BRIDGE — core B+C integration */}
        {vocabInsights&&<VocabInsightsPanel insights={vocabInsights} state={state} setState={setState}/>}
      </div>}
    </div>}

    {tab==="archive"&&<div className="fu">
      {essays.length===0
        ? <div className="empty">
            <div className="empty-icon">📚</div>
            <div style={{fontSize:13,marginBottom:6}}>Chưa có bài nào trong archive.</div>
            <div style={{fontSize:11,color:"var(--ink3)"}}>Chấm một bài hoặc bấm <strong>💾 Save</strong> ở tab Grade để lưu bài đầu tiên.</div>
          </div>
        : <>
          <div className="card mb14">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
              <div className="card-h" style={{margin:0}}><div className="cdot"/>Archive · {essays.length} bài</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button className="btn bg bsm" onClick={exportAllEssays}>⬇ Export JSON</button>
                <button className="btn bg bsm" onClick={()=>{
                  if (window.confirm(`Xoá toàn bộ ${essays.length} bài? Không thể khôi phục.`)) {
                    setState(s=>({...s, essays: []}));
                    setSaveMsg("✓ Đã xoá toàn bộ archive.");
                    setTimeout(()=>setSaveMsg(""),3500);
                  }
                }} style={{color:"var(--rose)"}}>🗑 Clear all</button>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {(()=>{
                const dueCount = getDueRevisits(essays).length;
                return [
                  {id:"all",label:`All (${essays.length})`},
                  {id:"graded",label:`✓ Graded (${essays.filter(e=>e.gradeResult).length})`},
                  {id:"draft",label:`✎ Draft (${essays.filter(e=>!e.gradeResult).length})`},
                  ...(dueCount>0 ? [{id:"due",label:`🔁 Revisit due (${dueCount})`}] : [])
                ].map(f=>
                  <button key={f.id} className={`sublist-btn ${archiveFilter===f.id?"active":""}`} onClick={()=>setArchiveFilter(f.id)}>{f.label}</button>
                );
              })()}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {essays
              .filter(e=>{
                if (archiveFilter==="all") return true;
                if (archiveFilter==="graded") return !!e.gradeResult;
                if (archiveFilter==="draft") return !e.gradeResult;
                if (archiveFilter==="due") return e.gradeResult && e.revisitDue && !e.revisitedAt && e.revisitDue <= Date.now();
                return true;
              })
              .map(e=>{
                const isOpen = expandedEssayId===e.id;
                const promptPreview = (e.promptText||"(không có đề)").slice(0,90);
                const band = e.gradeResult?.overall;
                return <div key={e.id} className="card" style={{padding:0,overflow:"hidden"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",borderBottom:isOpen?"1px solid var(--border)":"none"}}
                       onClick={()=>setExpandedEssayId(isOpen?null:e.id)}>
                    <div style={{flexShrink:0,width:38,textAlign:"center"}}>
                      {band!=null
                        ? <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:bandColor(band),lineHeight:1,fontWeight:500}}>{band.toFixed(1)}</div>
                        : <div style={{fontSize:18,color:"var(--ink3)"}}>✎</div>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink2)"}}>{e.date}</span>
                        {e.chartType&&<span className="chip cs" style={{fontSize:9,padding:"1px 7px"}}>{e.chartType}</span>}
                        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{e.wordCount}w</span>
                        {!e.gradeResult&&<span className="chip ch" style={{fontSize:9,padding:"1px 7px"}}>DRAFT</span>}
                        {/* V6: revisit status badges */}
                        {e.revisitedFromId&&<span className="chip co" style={{fontSize:9,padding:"1px 7px"}} title="This is a revision of an earlier essay">🔁 revision</span>}
                        {e.gradeResult&&e.revisitDue&&!e.revisitedAt&&e.revisitDue<=Date.now()&&
                          <span style={{fontSize:9,color:"var(--orchid)",fontFamily:"'Geist Mono',monospace",letterSpacing:".05em",fontWeight:700,padding:"1px 6px",border:"1px solid var(--orchid)",borderRadius:4}}>🔁 due to revisit</span>}
                        {e.revisitedAt&&<span style={{fontSize:9,color:"var(--leaf)",fontFamily:"'Geist Mono',monospace"}}>✓ revisited</span>}
                      </div>
                      <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{promptPreview}{(e.promptText||"").length>90?"…":""}</div>
                    </div>
                    <div style={{flexShrink:0,fontSize:14,color:"var(--ink3)"}}>{isOpen?"▾":"▸"}</div>
                  </div>
                  {isOpen&&<div style={{padding:"14px 16px",background:"var(--surface2)"}}>
                    {e.promptText&&<div style={{marginBottom:12}}>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>Question</div>
                      <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.55,fontStyle:"italic"}}>{e.promptText}</div>
                    </div>}
                    <div style={{marginBottom:12}}>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:5}}>Essay · {e.wordCount} words</div>
                      <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,fontFamily:"'Fraunces',serif",fontWeight:300,whiteSpace:"pre-wrap",background:"#060608",borderRadius:8,padding:"12px 14px",border:"1px solid var(--border)"}}>{e.essay}</div>
                    </div>
                    {e.gradeResult&&<div style={{marginBottom:12}}>
                      <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:6}}>Grade · Overall Band {e.gradeResult.overall?.toFixed(1)}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}}>
                        {[{k:"ta",n:"TA"},{k:"cc",n:"CC"},{k:"lr",n:"LR"},{k:"gra",n:"GRA"}].map(({k,n})=>{
                          const d = e.gradeResult[k];
                          if (!d) return null;
                          return <div key={k} style={{background:"var(--surface)",borderRadius:7,padding:"7px 9px",textAlign:"center",border:"1px solid var(--border)"}}>
                            <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",letterSpacing:".06em"}}>{n}</div>
                            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,color:bandColor(d.band),lineHeight:1.1}}>{d.band?.toFixed?.(1)||d.band}</div>
                          </div>;
                        })}
                      </div>
                      {e.gradeResult.overallComment&&<div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.55,marginBottom:6}}>{e.gradeResult.overallComment}</div>}
                      {e.gradeResult.topPriority&&<div style={{fontSize:11.5,color:"var(--orchid)",lineHeight:1.5}}><strong style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",marginRight:5}}>Priority:</strong>{e.gradeResult.topPriority}</div>}
                      {e.gradeResult.topStrength&&<div style={{fontSize:11.5,color:"var(--leaf)",lineHeight:1.5,marginTop:3}}><strong style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".08em",textTransform:"uppercase",marginRight:5}}>Strength:</strong>{e.gradeResult.topStrength}</div>}
                    </div>}
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:10,borderTop:"1px dashed var(--border)"}}>
                      {/* V6: Revisit button — only for graded essays */}
                      {e.gradeResult&&<button className="btn bl bsm" onClick={()=>startRevisit(e)} title="Write a fresh attempt at this prompt — old essay is hidden">🔁 Revisit (blind)</button>}
                      <button className="btn bs bsm" onClick={()=>loadEssayToEditor(e)}>↻ Load to editor</button>
                      <button className="btn bg bsm" onClick={()=>copyEssayToClipboard(e)}>📋 Copy</button>
                      <button className="btn bg bsm" onClick={()=>deleteEssay(e.id)} style={{color:"var(--rose)",marginLeft:"auto"}}>🗑 Delete</button>
                    </div>
                  </div>}
                </div>;
              })
            }
          </div>
        </>
      }
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: SETTINGS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


function PracticePage({state,setState,config}) {
  const [practiceTask,setPracticeTaskRaw] = useState(()=>state.writingDrafts?.activePracticeTask || "task1");
  const setPracticeTask = (nextTask) => {
    setPracticeTaskRaw(nextTask);
    setState(s=>({...s,writingDrafts:{...(s.writingDrafts||{}),activePracticeTask:nextTask}}));
  };
  return <div className="canvas fu">
    <div className="kicker">AI Tools - Writing</div>
    <h1 className="title-x">Writing <em>Lab</em></h1>
    <div className="mode-toggle">
      <button className={`mode-btn ${practiceTask==="task1"?"active":""}`} onClick={()=>setPracticeTask("task1")}>Task 1</button>
      <button className={`mode-btn ${practiceTask==="task2"?"active":""}`} onClick={()=>setPracticeTask("task2")}>Task 2</button>
      <button className={`mode-btn ${practiceTask==="full"?"active":""}`} onClick={()=>setPracticeTask("full")}>Full Test</button>
      <button className={`mode-btn ${practiceTask==="review"?"active":""}`} onClick={()=>setPracticeTask("review")}>Review Tools</button>
    </div>
    {practiceTask==="task1"
      ? <Task1PracticePage state={state} setState={setState} config={config} embedded={true}/>
      : practiceTask==="task2"
        ? <Task2Page state={state} setState={setState} config={config} embedded={true}/>
        : practiceTask==="full"
          ? <FullTestMode state={state} setState={setState} config={config}/>
          : <WritingReviewDashboard state={state} setState={setState} config={config}/>}
  </div>;
}
