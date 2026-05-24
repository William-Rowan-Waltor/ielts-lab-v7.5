function ImportVocabView({state,setState,config,onBack}) {
  const [text,setText] = useState("");
  const [candidates,setCandidates] = useState([]);
  const [extracting,setExtracting] = useState(false);
  const [generating,setGenerating] = useState(false);
  const [progress,setProgress] = useState({cur:0,tot:0,word:""});
  const [errMsg,setErrMsg] = useState("");
  const [doneCount,setDoneCount] = useState(0);

  const extract = async () => {
    if (!text.trim()) { setErrMsg("Paste text first."); return; }
    if (!config) { setErrMsg("Set up AI in Settings first."); return; }
    setExtracting(true); setErrMsg(""); setDoneCount(0);
    try {
      const prompt = `From the text below, extract the most IELTS-worthy academic vocabulary (single words only, base form / lemma).
Focus on:
- Academic words from AWL or comparable academic vocab lists
- Words useful for IELTS Writing Task 1/2 (data description, argumentation, hedging, transitions)
- Skip very common words (the, is, very, good, get, big, etc.) and proper nouns
- Skip basic A1/A2 vocab

Return ONLY a JSON array of lowercase base-form words, up to 30 items. No markdown, no fence.
Example: ["analyse","data","significant","approach","comprehensive"]

TEXT:
${text.slice(0,4000)}`;
      const raw = await callAPI(config,[{role:"user",content:prompt}],800);
      const words = safeJSON(raw);
      if (!Array.isArray(words)) throw new Error("Bad response shape");
      const custom = state.customVocab||{};
      const cands = [];
      const seen = new Set();
      for (const r of words) {
        const w = String(r).toLowerCase().trim().replace(/[^a-z-]/g,"");
        if (!w||w.length<3||seen.has(w)) continue;
        seen.add(w);
        let status="new", sublist=null;
        if (AWL_DATA_MAP.has(w)) { status="awl"; sublist=AWL_DATA_MAP.get(w).s; }
        else if (custom[w]) { status="custom"; }
        cands.push({word:w,status,sublist,selected:status==="new"});
      }
      setCandidates(cands);
    } catch(e) { setErrMsg("Extract failed: "+e.message); }
    finally { setExtracting(false); }
  };

  const toggle = (i) => setCandidates(c=>c.map((x,j)=>j===i?{...x,selected:!x.selected}:x));
  const selectAll = (on) => setCandidates(c=>c.map(x=>x.status==="new"?{...x,selected:on}:x));

  const generate = async () => {
    const selected = candidates.filter(c=>c.selected&&c.status==="new");
    if (selected.length===0) { setErrMsg("No new words selected."); return; }
    if (!config) { setErrMsg("Set up AI in Settings first."); return; }
    setGenerating(true); setErrMsg(""); setDoneCount(0);
    setProgress({cur:0,tot:selected.length,word:""});
    const newCustom = {...(state.customVocab||{})};
    let nextId = Object.keys(newCustom).length+1;
    let done = 0;
    for (const c of selected) {
      setProgress({cur:done,tot:selected.length,word:c.word});
      try {
        const prompt = `For the academic word "${c.word}", produce a compact JSON entry matching this EXACT schema (no markdown, no preamble, no fence):
{
  "id":"custom-${String(nextId).padStart(3,"0")}",
  "s":"custom",
  "hw":"${c.word}",
  "fam":{"n":["noun forms"],"v":["verb forms"],"adj":["adjective forms"],"adv":["adverb forms"]},
  "vi":"concise Vietnamese gloss",
  "t1":"IELTS Task 1 example sentence (chart/data/trend context)",
  "ex":"general academic example (using a non-headword family form if possible)",
  "col":["collocation 1","collocation 2","collocation 3"]
}
Rules:
- Include all genuine family forms; use [] for POS categories that don't apply (e.g. verb-only words have n:[], adj:[], adv:[]).
- Both t1 and ex must contain at least one family-form word (so the quiz engine can derive fill-blanks).
- Keep sentences 12–22 words each.
- vi: 2–6 Vietnamese words. No English.
- col: real attested collocations, lowercase, no period.`;
        const raw = await callAPI(config,[{role:"user",content:prompt}],600);
        const entry = safeJSON(raw);
        if (entry&&entry.hw) {
          // Normalize: ensure hw is the word, sublist is "custom"
          entry.hw = c.word;
          entry.s = "custom";
          entry.fam = entry.fam||{n:[],v:[],adj:[],adv:[]};
          entry.col = entry.col||[];
          newCustom[c.word] = entry;
          nextId++; done++;
        }
      } catch(e) { console.error("gen failed for",c.word,e); }
    }
    setState(s=>({...s,customVocab:newCustom}));
    setDoneCount(done);
    // Remove generated words from candidate list so user sees remaining
    setCandidates(c=>c.filter(x=>!(x.selected&&x.status==="new"&&newCustom[x.word])));
    setGenerating(false);
    setProgress({cur:done,tot:selected.length,word:""});
  };

  const newCount = candidates.filter(c=>c.status==="new").length;
  const dupeCount = candidates.length-newCount;
  const selectedCount = candidates.filter(c=>c.selected&&c.status==="new").length;
  const customTotal = Object.keys(state.customVocab||{}).length;

  return <div className="canvas fu">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <button className="btn bg bsm" onClick={onBack}>← Back</button>
      <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>{customTotal} custom words saved</span>
    </div>
    <h1 className="title-x">Import <em>Vocabulary</em></h1>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Paste text</div>
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder="Paste any English text (article, reading passage, essay you graded, etc.) — AI extracts IELTS-worthy words, skips duplicates against AWL + your existing custom vocab, then auto-generates full entries (vi/t1/ex/col + family)."
        style={{width:"100%",minHeight:140,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--ink)",padding:10,borderRadius:8,fontSize:13,fontFamily:"inherit",resize:"vertical",lineHeight:1.5}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:"var(--ink3)"}}>{text.length} chars · max 4000 sent</span>
        <div style={{display:"flex",gap:6}}>
          <button className="btn bg bsm" disabled style={{opacity:0.5,cursor:"not-allowed"}}>📷 Image (soon)</button>
          <button className="btn bp bsm" disabled={extracting||!text.trim()} onClick={extract}>
            {extracting?<><Spinner/> Extracting...</>:"✨ Extract candidates"}
          </button>
        </div>
      </div>
      {errMsg&&<div className="alert ar mt8" style={{marginBottom:0}}>⚠ {errMsg}</div>}
    </div>

    {candidates.length>0&&<div className="card mb14">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
        <div className="card-h" style={{margin:0}}><div className="cdot"/>Candidates · <span style={{color:"var(--leaf)"}}>{newCount} new</span>{dupeCount>0&&<span style={{color:"var(--ink3)"}}> · {dupeCount} dup</span>}</div>
        {newCount>0&&<div style={{display:"flex",gap:6}}>
          <button className="btn bg bsm" onClick={()=>selectAll(true)}>Select all</button>
          <button className="btn bg bsm" onClick={()=>selectAll(false)}>None</button>
        </div>}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {candidates.map((c,i)=>{
          const isDupe = c.status!=="new";
          const dupeLabel = c.status==="awl"?`Sub ${c.sublist}`:"custom";
          return <button key={i} onClick={()=>!isDupe&&toggle(i)} disabled={isDupe}
            style={{
              background: isDupe?"var(--surface2)":(c.selected?"#a3e635":"var(--surface)"),
              color: isDupe?"var(--ink3)":(c.selected?"#09090b":"var(--ink)"),
              border:`1px solid ${c.selected&&!isDupe?"#a3e635":"var(--border)"}`,
              borderRadius:6,padding:"5px 10px",fontSize:12,cursor:isDupe?"not-allowed":"pointer",
              opacity:isDupe?0.55:1,fontFamily:"'Geist Mono',monospace",fontWeight:c.selected?600:400
            }}>
            {c.word}{isDupe&&<span style={{fontSize:9,marginLeft:5,color:"var(--ink3)"}}>({dupeLabel})</span>}
          </button>;
        })}
      </div>
      <button className="btn bp" disabled={generating||selectedCount===0} onClick={generate}>
        {generating
          ?<><Spinner/> Generating {progress.cur}/{progress.tot}{progress.word?`: ${progress.word}`:""}...</>
          :`✦ Generate ${selectedCount} entr${selectedCount===1?"y":"ies"}`}
      </button>
    </div>}

    {doneCount>0&&!generating&&<div className="alert ag">✓ <strong>{doneCount}</strong> word{doneCount>1?"s":""} added to your custom vocab. They behave like AWL entries — load instantly offline, work in quiz/study mode. Sublist label: <code>custom</code>.</div>}
  </div>;
}

function VocabPage({state,setState,config}) {
  const [view,setView] = useState("home");
  const [studyIdx,setStudyIdx] = useState(0);
  const [wordData,setWordData] = useState(null);
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState(null);
  const [quizKey,setQuizKey] = useState(0);
  // V5: extra session size — user picks how many extra words to study past daily limit
  const [extraSize,setExtraSize] = useState(5);
  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  const todayWords = todayEntry?.wordIndices||[];
  // V5 — DST-safe streak (addDays), counts past streak even if today not yet done
  const streak = useMemo(()=>{
    let s=0,d=new Date();
    if(!state.completedDays[localDateStr(d)]) d=addDays(d,-1);
    while(state.completedDays[localDateStr(d)]){s++;d=addDays(d,-1);}
    return s;
  },[state.completedDays]);
  const mastered = Object.values(state.mastery).filter(m=>m>=5).length;
  const priorityIdxs = useMemo(()=>state.priorityWords.map(w=>AWL_WORDS.findIndex(a=>a.w===w)).filter(i=>i>=0),[state.priorityWords]);

  // V5: real progress today (from dailyStats)
  const todayStats = state.dailyStats?.[today] || {target:0, extra:0, words:[]};
  const todayLearnedCount = todayStats.words?.length || 0;

  // V5: pick next N unlearned words for extra session
  // Strategy: prefer words not yet in mastery (truly new), filtered by active sublists,
  // excluding what's already scheduled for today (avoid double-counting).
  const extraIdxs = useMemo(()=>{
    const activeSet = new Set(state.activeSublists||[1,2,3,4,5,6,7,8,9,10]);
    const todaySet = new Set(todayWords);
    const learnedSet = new Set(Object.keys(state.mastery));
    const candidates = AWL_WORDS
      .map((w,i)=>({w,i}))
      .filter(x => activeSet.has(x.w.s) && !learnedSet.has(x.w.w) && !todaySet.has(x.i));
    return candidates.slice(0, extraSize).map(x=>x.i);
  },[state.activeSublists, state.mastery, todayWords, extraSize]);

  // V5: session mode flags
  const isBoostMode = view==="boost"||view==="boost-quiz";
  const isExtraMode = view==="extra"||view==="extra-quiz";
  const studyWordList = isBoostMode ? priorityIdxs : (isExtraMode ? extraIdxs : todayWords);
  const sessionLabel = isBoostMode ? "Priority Boost" : (isExtraMode ? "Extra Session" : "Study");

  const loadWord = async (word) => {
    if (state.wordCache[word]) { setWordData(state.wordCache[word]); setErr(null); return; }
    // Phase 2: Check pre-baked AWL_DATA first (offline, instant)
    const prebaked = AWL_DATA_MAP.get(word);
    if (prebaked) {
      const data = awlEntryToWordCardData(prebaked);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data); setErr(null);
      return;
    }
    // F1: Check user-imported custom vocab (also offline)
    const custom = state.customVocab?.[word];
    if (custom) {
      const data = awlEntryToWordCardData(custom);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data); setErr(null);
      return;
    }
    // Fallback: AI-generated for words outside Sub 1-3
    if (!config) { setErr("Word not in offline pack. Configure AI in Settings to load."); return; }
    setLoading(true); setErr(null); setWordData(null);
    try {
      const data = await fetchWordData(word, config);
      setState(s => ({...s, wordCache: {...s.wordCache, [word]: data}}));
      setWordData(data);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const recentDays = schedule.slice(0,14);

  const handleStudyDone = () => {
    if (studyIdx+1 < studyWordList.length) {
      setStudyIdx(i=>i+1);
      setWordData(null);
      loadWord(AWL_WORDS[studyWordList[studyIdx+1]]?.w);
    } else {
      // Route to appropriate quiz based on session type
      setView(isBoostMode?"boost-quiz":(isExtraMode?"extra-quiz":"quiz"));
    }
  };

  const handleQuizComplete = (results) => {
    setState(s => {
      const newMastery = {...s.mastery};
      // Track per-word; quiz now provides multiple results per word (MC + family forms)
      results.forEach(r=>{
        const k=r.word||r.headword;
        if(!k)return;
        const cur=newMastery[k]??0;
        // Smaller increments since more data points per session now
        newMastery[k]=r.correct?Math.min(5,cur+0.5):Math.max(0,cur-0.5);
      });
      // Round to integers for display
      Object.keys(newMastery).forEach(k=>newMastery[k]=Math.round(newMastery[k]));
      // V5: telemetry — record real progress regardless of session type
      const studiedWords = studyWordList.map(i=>AWL_WORDS[i]?.w).filter(Boolean);
      const prevStat = s.dailyStats?.[today] || {target:0, extra:0, words:[]};
      const prevSet = new Set(prevStat.words);
      const newWordsThisSession = studiedWords.filter(w=>!prevSet.has(w));
      // Determine if this session was 'extra' (beyond daily target):
      //   - boost & extra modes → always extra
      //   - regular session after todayDone → extra
      const isExtraSession = isBoostMode || isExtraMode || s.completedDays[today];
      const newStat = {
        target: isExtraSession ? prevStat.target : (todayWords.length || s.wordsPerDay || 3),
        extra: prevStat.extra + (isExtraSession ? newWordsThisSession.length : 0),
        words: [...prevStat.words, ...newWordsThisSession]
      };
      const newDailyStats = {...(s.dailyStats||{}), [today]: newStat};
      // Mark today complete: regular session completes the day; boost/extra do not flip the flag
      // (they're stretch goals on top of an already-done day, OR a way to push without forcing completion).
      const newCompleted = (isBoostMode||isExtraMode) ? s.completedDays : {...s.completedDays,[today]:true};
      // Remove priority words that have reached mastery >= 4
      const newPriority = s.priorityWords.filter(w=>(newMastery[w]||0)<4);
      return {...s, mastery:newMastery, completedDays:newCompleted, priorityWords:newPriority, dailyStats:newDailyStats};
    });
    setView("done");
  };

  useEffect(()=>{
    if ((view==="study"||view==="boost"||view==="extra")&&studyWordList[studyIdx]!=null) {
      loadWord(AWL_WORDS[studyWordList[studyIdx]]?.w);
    }
  },[view,studyIdx]);

  if (view==="study"||view==="boost"||view==="extra") {
    const word = AWL_WORDS[studyWordList[studyIdx]]?.w;
    return <div className="canvas fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button className="btn bg bsm" onClick={()=>setView("home")}>← Back</button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>
          {sessionLabel} · {studyIdx+1}/{studyWordList.length}
        </span>
      </div>
      <PBar value={studyIdx+1} max={studyWordList.length}/>
      <div style={{marginTop:16}}>
        <WordCard wordData={state.wordCache[word]||wordData} isLoading={loading&&!state.wordCache[word]}
          mastery={state.mastery[word]||0} errMsg={err} canRegen={!!config}
          onRegen={()=>{setState(s => { const nc = {...s.wordCache}; delete nc[word]; return {...s, wordCache: nc}; }); loadWord(word);}}/>
      </div>
      {(wordData||state.wordCache[word])&&!loading&&
        <button className="btn bp mt14" style={{width:"100%",justifyContent:"center"}} onClick={handleStudyDone}>
          {studyIdx+1<studyWordList.length?"Next Word →":"Go to Quiz →"}
        </button>}
    </div>;
  }

  if (view==="quiz"||view==="boost-quiz"||view==="extra-quiz") {
    return <div className="canvas fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button className="btn bg bsm" onClick={()=>setView("home")}>← Back</button>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink3)"}}>Quiz · {sessionLabel}</span>
      </div>
      <QuizMode key={quizKey} wordIndices={studyWordList} wordCache={state.wordCache} masteryMap={state.mastery}
        onComplete={handleQuizComplete}
        onLoadMissing={async (missing)=>{
          for (const w of missing) { try { await loadWord(w); } catch {} }
          setQuizKey(k=>k+1);
        }}
        onGenMore={async (cachedWords)=>{
          // Refresh wordData via AI for first 5 words → fresh examples & fill-blanks → reshuffled quiz
          if (!config) { alert("Set up AI in Settings to gen fresh items."); return; }
          const slice = cachedWords.slice(0,5);
          for (const w of slice) {
            try {
              const data = await fetchWordData(w, config);
              setState(s=>({...s,wordCache:{...s.wordCache,[w]:data}}));
            } catch (e) { console.error("regen failed for",w,e); }
          }
          setQuizKey(k=>k+1);
        }}/>
    </div>;
  }

  if (view==="import") return <ImportVocabView state={state} setState={setState} config={config} onBack={()=>setView("home")}/>;

  if (view==="done") return <div className="canvas" style={{textAlign:"center",paddingTop:60}}>
    <div style={{fontSize:52,marginBottom:12}}>✅</div>
    <div style={{fontFamily:"'Fraunces',serif",fontSize:24,color:"var(--ink)",marginBottom:6}}>Session Complete!</div>
    <div style={{color:"var(--ink3)",marginBottom:20}}>
      Streak: {streak+(state.completedDays[today]?0:1)}🔥 · Mastered: {mastered}
      {(state.dailyStats?.[today]?.extra||0)>0 && <span style={{color:"var(--honey)",marginLeft:8}}>· +{state.dailyStats[today].extra} extra today 🚀</span>}
    </div>
    <button className="btn bp" onClick={()=>setView("home")}>Back to Home</button>
  </div>;

  return <div className="canvas fu">
    <div className="kicker">Academic Word List · 570 words</div>
    <h1 className="title-x">Vocab <em>Daily</em></h1>
    <div className="cols-3" style={{marginBottom:14}}>
      {[{v:`${streak}🔥`,l:"Streak"},{v:mastered,l:"Mastered"},{v:Object.keys(state.mastery).length,l:"Learned"}].map(s=>
        <div key={s.l} className="card" style={{textAlign:"center"}}>
          <div className="sv">{s.v}</div><div className="sl">{s.l}</div>
        </div>)}
    </div>
    <div className="card mb14">
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--ink3)",marginBottom:5}}>
        <span>AWL Progress · Sub {(state.activeSublists||[]).join(",")}</span>
        <span style={{color:"var(--leaf)"}}>{(()=>{
          const activeSet = new Set(state.activeSublists||[1,2,3,4,5,6,7,8,9,10]);
          const eligible = AWL_WORDS.filter(w=>activeSet.has(w.s));
          const learned = eligible.filter(w=>(state.mastery[w.w]||0)>0).length;
          return `${learned} / ${eligible.length}`;
        })()}</span>
      </div>
      <PBar value={(()=>{
        const activeSet = new Set(state.activeSublists||[1,2,3,4,5,6,7,8,9,10]);
        return AWL_WORDS.filter(w=>activeSet.has(w.s)&&(state.mastery[w.w]||0)>0).length;
      })()} max={(()=>{
        const activeSet = new Set(state.activeSublists||[1,2,3,4,5,6,7,8,9,10]);
        return AWL_WORDS.filter(w=>activeSet.has(w.s)).length;
      })()}/>
    </div>

    <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
      <button className="btn bs bsm" onClick={()=>setView("import")}>+ Import vocab from text</button>
      {Object.keys(state.customVocab||{}).length>0&&<span style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>📦 {Object.keys(state.customVocab).length} custom word{Object.keys(state.customVocab).length>1?"s":""}</span>}
    </div>

    {priorityIdxs.length > 0 && <div className="card mb14" style={{border:"1px solid rgba(163,230,53,.25)",background:"rgba(163,230,53,.03)"}}>
      <div className="card-h"><div className="cdot"/>✦ Priority Boost · {priorityIdxs.length} words from your essays</div>
      <div className="chips mb8">
        {state.priorityWords.slice(0,8).map(w=><span key={w} className="chip cl">{w}<span style={{color:"var(--ink3)",marginLeft:3,fontSize:9}}>M{state.mastery[w]||0}</span></span>)}
        {state.priorityWords.length>8&&<span className="chip" style={{color:"var(--ink3)"}}>+{state.priorityWords.length-8} more</span>}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button className="btn bl bsm" onClick={()=>{setStudyIdx(0);setView("boost");}}>Study Boost Words</button>
        <button className="btn bg bsm" onClick={()=>{setStudyIdx(0);setView("boost-quiz");}}>Quiz Only</button>
        <button className="btn bg bsm" onClick={()=>setState({...state,priorityWords:[]})}>Clear Queue</button>
      </div>
    </div>}

    <div className="card mb14">
      <div style={{color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10}}>
        Today · {today}
        {todayLearnedCount>0 && <span style={{color:"var(--leaf)",marginLeft:8,textTransform:"none",letterSpacing:0}}>
          · {todayLearnedCount} learned{(state.dailyStats?.[today]?.extra||0)>0?` (+${state.dailyStats[today].extra} extra)`:""}
        </span>}
      </div>
      {todayDone
        ? <div>
            <div style={{padding:"10px 0",color:"var(--leaf)",fontSize:14,fontWeight:500,textAlign:"center",marginBottom:8}}>Daily target done ✓</div>
            {/* V5: continue past limit */}
            {extraIdxs.length > 0 ? <div style={{padding:"10px 12px",background:"var(--surface2)",borderRadius:8,border:"1px dashed var(--border2)"}}>
              <div style={{fontSize:12,color:"var(--ink2)",marginBottom:7,lineHeight:1.5}}>
                Want to push further? Pick how many <strong style={{color:"var(--honey)"}}>extra words</strong> to learn today:
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:9}}>
                {[3,5,10,15].map(n=>
                  <button key={n} className={`btn ${extraSize===n?"bp":"bg"} bsm`} onClick={()=>setExtraSize(n)}>{n}</button>
                )}
                <span style={{fontSize:10,color:"var(--ink3)",alignSelf:"center",fontFamily:"'Geist Mono',monospace"}}>
                  ({extraIdxs.length} available)
                </span>
              </div>
              <div className="chips mb8">
                {extraIdxs.slice(0,8).map(i=><span key={i} className="chip">{AWL_WORDS[i]?.w}</span>)}
                {extraIdxs.length>8&&<span className="chip" style={{color:"var(--ink3)"}}>+{extraIdxs.length-8}</span>}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn bp bsm" onClick={()=>{setStudyIdx(0);setView("extra");setWordData(null);setErr(null);}}>Study {extraIdxs.length} extra →</button>
                <button className="btn bg bsm" onClick={()=>{setStudyIdx(0);setView("extra-quiz");}}>Quiz Only</button>
              </div>
            </div> : <div style={{textAlign:"center",color:"var(--ink3)",fontSize:12,padding:"6px 0"}}>All eligible new words learned 🎓 — come back tomorrow or review!</div>}
          </div>
        : todayEntry
          ? <div>
              <div style={{color:"var(--ink)",fontSize:14,fontWeight:500,marginBottom:4}}>
                {todayEntry.type==="review7"?"📚 Weekly Review":todayEntry.type==="review3"?"🔄 3-Day Review":`📖 ${todayEntry.wordIndices?.length||state.wordsPerDay||3} New Words`}
              </div>
              <div className="chips mb8">
                {todayWords.map(i=><span key={i} className={`chip ${state.wordCache[AWL_WORDS[i]?.w]?"cl":""}`}>{AWL_WORDS[i]?.w}</span>)}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn bp bsm" onClick={()=>{setStudyIdx(0);setView("study");setWordData(null);setErr(null);}}>Study Words</button>
                <button className="btn bg bsm" onClick={()=>{setStudyIdx(0);setView("quiz");}}>Quiz Only</button>
              </div>
            </div>
          : <div style={{color:"var(--ink3)"}}>All 570 words completed! 🎓</div>}
    </div>

    <div className="card">
      <div className="card-h"><div className="cdot"/>Upcoming Schedule</div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {recentDays.map(d=>{
          const isT=d.date===today,isP=d.date<today,done=state.completedDays[d.date];
          const tc=d.type==="review7"?"var(--honey)":d.type==="review3"?"var(--sky)":"var(--leaf)";
          const tl=d.type==="review7"?"Weekly Review":d.type==="review3"?"3-Day Review":`${d.wordIndices?.length||state.wordsPerDay||3} new`;
          // V5: surface extra-learning days
          const dayStat = state.dailyStats?.[d.date];
          const hasExtra = (dayStat?.extra||0) > 0;
          return <div key={d.date} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 8px",borderRadius:7,background:isT?"rgba(163,230,53,.06)":"transparent",border:isT?"1px solid rgba(163,230,53,.15)":"1px solid transparent",opacity:isP&&!done?.4:1}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:tc,flexShrink:0}}/>
            <div style={{flex:1,fontSize:11,color:isT?"var(--ink)":"var(--ink3)"}}>{d.date.slice(5)}{isT&&<span style={{color:"var(--leaf)",fontWeight:700}}> · Today</span>}</div>
            <div style={{fontSize:10,color:tc}}>{tl}</div>
            {hasExtra&&<span style={{color:"var(--honey)",fontSize:9,fontFamily:"'Geist Mono',monospace"}} title={`${dayStat.words.length} total · ${dayStat.extra} extra`}>+{dayStat.extra}🚀</span>}
            {done&&<span style={{color:"var(--leaf)",fontSize:12}}>✓</span>}
            {isP&&!done&&<span style={{color:"var(--rose)",fontSize:9}}>missed</span>}
          </div>;
        })}
      </div>
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: THEORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
