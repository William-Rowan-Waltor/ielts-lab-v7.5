function PBar({value,max,color="#a3e635"}) {
  return <div className="pbar"><div className="pbar-fill" style={{width:`${max>0?Math.min(100,(value/max)*100):0}%`,background:color}}/></div>;
}
function MasteryDots({m}) {
  return <div className="mdots">{[1,2,3,4,5].map(i=><div key={i} className="mdot" style={{background:i<=m?"#a3e635":"transparent"}}/>)}</div>;
}
function bandColor(b) {
  if (b>=7.5) return "var(--leaf)"; if (b>=6.5) return "var(--sky)";
  if (b>=5.5) return "var(--honey)"; return "var(--rose)";
}
// POS helpers — maps AI-returned POS strings to standard class codes
function posToClass(posStr) {
  if (!posStr) return "";
  const s = String(posStr).toLowerCase().trim();
  if (s.startsWith("adv") || s.includes("adverb")) return "pos-adv";
  if (s.startsWith("adj") || s.includes("adjective")) return "pos-adj";
  if (s.startsWith("v") || s.includes("verb")) return "pos-v";
  if (s.startsWith("n") || s.includes("noun")) return "pos-n";
  return "";
}
function posToShort(posStr) {
  const cls = posToClass(posStr);
  return cls==="pos-n"?"N":cls==="pos-v"?"V":cls==="pos-adj"?"ADJ":cls==="pos-adv"?"ADV":(posStr||"");
}
function Spinner() { return <span className="spin"/>; }
function Loading({text="Loading..."}) { return <div className="loading"><Spinner/><span>{text}</span></div>; }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORD CARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function FillBlanks({items}) {
  const [ans,setAns] = useState({}), [chk,setChk] = useState({});
  return <div style={{display:"flex",flexDirection:"column",gap:10}}>
    {items.map((item,i)=>{
      const ok = chk[i]!==undefined ? ans[i]?.toLowerCase().trim()===item.answer.toLowerCase() : null;
      return <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 13px"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)",marginBottom:5}}>{item.context}</div>
        <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.6,marginBottom:7}}>{item.sentence.replace("___","______")}</div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input type="text" value={ans[i]||""} onChange={e=>setAns(p=>({...p,[i]:e.target.value}))}
            disabled={!!chk[i]} placeholder="Your answer..." onKeyDown={e=>e.key==="Enter"&&setChk(p=>({...p,[i]:true}))}
            style={{flex:1,borderColor:ok===true?"var(--leaf)":ok===false?"var(--rose)":"var(--border2)"}}/>
          <button className="btn bp bsm" onClick={()=>setChk(p=>({...p,[i]:true}))}>Check</button>
          {ok===true&&<span style={{color:"var(--leaf)",fontSize:16}}>✓</span>}
          {ok===false&&<span style={{color:"var(--rose)",fontSize:11}}>→ {item.answer}</span>}
        </div>
      </div>;
    })}
  </div>;
}

function WordCard({wordData,isLoading,mastery,onRegen,canRegen,errMsg}) {
  const [tab,setTab] = useState("defs");
  const tabs = [{id:"defs",label:"Definitions"},{id:"examples",label:"Examples"},{id:"family",label:"Family"},{id:"blanks",label:"Fill Blanks"}];
  const isT1 = wordData && TASK1_AWL.has(wordData.word);
  const famCount = wordData?.family?.length||0;
  if (errMsg) return <div style={{textAlign:"center",padding:40,color:"var(--rose)"}}>⚠ {errMsg}</div>;
  if (isLoading) return <Loading text="Generating word data..."/>;
  if (!wordData) return null;
  return <div className="fu">
    <div style={{textAlign:"center",marginBottom:18,position:"relative"}}>
      {canRegen&&<button className="btn bg bsm" onClick={onRegen} style={{position:"absolute",top:0,right:0}}>↻ Regen</button>}
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:6,flexWrap:"wrap"}}>
        {isT1&&<span className="t1-badge">✦ Task 1 key word</span>}{wordData?._source==="prebaked"&&<span style={{background:"var(--accent2,#0ea5e9)",color:"#fff",fontSize:10,padding:"2px 6px",borderRadius:6,marginLeft:6,fontWeight:600}}>📦 Offline</span>}
        {famCount>1&&<span className="family-badge">{famCount} family forms</span>}
      </div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:400,color:"var(--ink)",letterSpacing:-1,lineHeight:1}}>{wordData.word}</div>
      <div style={{color:"var(--orchid)",fontSize:13,marginTop:4,fontStyle:"italic"}}>{wordData.ipa} · {wordData.pos?.join(", ")}</div>
      <div style={{display:"flex",justifyContent:"center",marginTop:8,gap:6,alignItems:"center"}}>
        <span style={{color:"var(--ink3)",fontSize:11}}>mastery</span><MasteryDots m={mastery||0}/>
      </div>
    </div>
    <div className="word-tabs mb8">
      {tabs.map(t=><button key={t.id} className="word-tab" onClick={()=>setTab(t.id)}
        style={{background:tab===t.id?"#a3e635":"var(--surface2)",color:tab===t.id?"#09090b":"var(--ink3)"}}>{t.label}</button>)}
    </div>
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:16,minHeight:160}}>
      {tab==="defs"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {/* Main Definition — single source of truth (VI + EN) */}
        {wordData.definitions?.map((d,i)=><div key={i} style={{borderLeft:"2px solid var(--leaf)",paddingLeft:12}}>
          <div style={{display:"flex",gap:5,marginBottom:4,flexWrap:"wrap"}}>
            <span className="chip cl" style={{fontSize:10}}>{d.pos}</span>
            <span className="chip" style={{fontSize:10}}>{d.context}</span>
          </div>
          <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em",marginBottom:2}}>VI</div>
          <div style={{color:"var(--ink)",fontSize:14,lineHeight:1.55,marginBottom:7,fontWeight:400}}>{d.meaning}</div>
          {d.meaning_en&&<>
            <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",letterSpacing:".06em",marginBottom:2}}>EN</div>
            <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.55,fontStyle:"italic"}}>{d.meaning_en}</div>
          </>}
        </div>)}
        {/* Collocations panel — NEW: surface entry.col with pattern hints */}
        {wordData._collocations&&wordData._collocations.length>0&&<div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderLeft:"2px solid var(--orchid)",borderRadius:8,padding:"11px 13px",marginTop:4}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--orchid)",marginBottom:8,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6}}>
            <span>🔗 Collocations</span>
            <span style={{color:"var(--ink3)",fontWeight:400,letterSpacing:".04em",textTransform:"none",fontSize:9.5,fontStyle:"italic"}}>— typical word combinations</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {wordData._collocations.map((c,i)=>{
              const pat = detectCollocationPattern(c);
              return <div key={i} style={{background:"var(--surface)",border:"1px solid var(--border2)",borderRadius:6,padding:"6px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:13.5,color:"var(--ink)",fontStyle:"italic"}}>{c}</span>
                {pat&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",letterSpacing:".05em",whiteSpace:"nowrap"}}>{pat}</span>}
              </div>;
            })}
          </div>
        </div>}
        {/* Usage Tip — REPURPOSED from old "Intuition" block to give a DISTINCT pattern-anchored tip */}
        {wordData.intuition&&(wordData.intuition.vi||wordData.intuition.en)&&<div style={{background:"linear-gradient(135deg,rgba(96,165,250,.06),rgba(163,230,53,.04))",borderRadius:10,padding:"10px 13px",border:"1px solid var(--border)",borderLeft:"2px solid var(--sky)"}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".12em",color:"var(--sky)",marginBottom:6,textTransform:"uppercase"}}>💡 Usage Tip (Feynman)</div>
          {wordData.intuition.vi&&<div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.5,marginBottom:4}}>{wordData.intuition.vi}</div>}
          {wordData.intuition.en&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,fontStyle:"italic"}}>{wordData.intuition.en}</div>}
          {wordData.intuition.example&&<div style={{fontSize:11,color:"var(--ink3)",marginTop:7,paddingTop:6,borderTop:"1px dashed var(--border)",fontFamily:"'Geist Mono',monospace",lineHeight:1.5}}>e.g. {wordData.intuition.example}</div>}
        </div>}
      </div>}
      {tab==="examples"&&<div style={{display:"flex",flexDirection:"column",gap:9}}>
        {wordData.examples?.map((e,i)=><div key={i} style={{background:"var(--surface2)",borderRadius:9,padding:"9px 12px"}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:e.context?.toLowerCase().includes("task 1")?"var(--leaf)":"var(--sky)",marginBottom:5}}>{e.context}</div>
          <div style={{color:"var(--ink2)",fontSize:13,lineHeight:1.6,fontStyle:"italic"}}>"{e.sentence}"</div>
        </div>)}
      </div>}
      {tab==="family"&&<div>
        {wordData.family_definitions?.length>0 ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:11,color:"var(--ink3)",marginBottom:3}}>Each form has its own meaning, word-class and context (VI + EN):</div>
            {wordData.family_definitions.map((fd,i)=>{
              const exampleFB = wordData.family_fill_blanks?.find(fb=>fb.form===fd.form);
              const isHead = fd.form===wordData.word;
              const posCls = posToClass(fd.pos);
              const accent = isHead ? "var(--leaf)" : (posCls==="pos-n"?"var(--pos-n)":posCls==="pos-v"?"var(--pos-v)":posCls==="pos-adj"?"var(--pos-adj)":posCls==="pos-adv"?"var(--pos-adv)":"var(--orchid)");
              const srcLabel = fd._source==="manual" ? "✓ thủ công" : fd._source==="cross" ? "↗ entry riêng" : fd._source==="morphology" ? "⚙ morphology" : fd._source==="template" ? "≈ approx" : null;
              const srcColor = fd._source==="manual" ? "var(--leaf)" : fd._source==="cross" ? "var(--honey)" : fd._source==="morphology" ? "var(--sky)" : "var(--ink3)";
              return <div key={i} style={{background:"var(--surface2)",borderRadius:9,padding:"11px 13px",borderLeft:`2px solid ${accent}`}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6,flexWrap:"wrap"}}>
                  <span style={{fontFamily:"'Fraunces',serif",fontSize:17,color:accent,fontWeight:500,letterSpacing:-.3}}>{fd.form}</span>
                  <span className={`pos-pill ${posCls}`}>{fd.pos}</span>
                  {isHead&&<span className="chip cl" style={{fontSize:9,letterSpacing:".08em"}}>HEADWORD</span>}
                  {srcLabel&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:srcColor,letterSpacing:".05em",marginLeft:"auto"}}>{srcLabel}</span>}
                </div>
                <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--orchid)",letterSpacing:".05em",fontWeight:700,marginBottom:2}}>VI</div>
                <div style={{color:"var(--ink)",fontSize:12.5,lineHeight:1.55,marginBottom:fd.meaning_en?6:(exampleFB?5:0)}}>{fd.meaning}</div>
                {fd.meaning_en&&<>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--sky)",letterSpacing:".05em",fontWeight:700,marginBottom:2}}>EN</div>
                  <div style={{color:"var(--ink2)",fontSize:12,lineHeight:1.5,fontStyle:"italic",marginBottom:exampleFB?6:0}}>{fd.meaning_en}</div>
                </>}
                {exampleFB&&<div style={{color:"var(--ink3)",fontSize:11.5,fontStyle:"italic",lineHeight:1.5,paddingLeft:8,borderLeft:"1px solid var(--border2)",marginTop:4}}>"{exampleFB.sentence}"</div>}
              </div>;
            })}
          </div>
        ) : (
          <div>
            <div className="alert ai mb14">⚠ Old cached version (no definitions per form). Click <strong>↻ Regen</strong> at top to get updated data with per-form meanings.</div>
            <div className="chips" style={{marginBottom:0}}>
              {wordData.family?.map((f,i)=><span key={i} className={`chip ${i===0?"cl":"co"}`} style={{fontSize:12}}>{f}</span>)}
            </div>
            {wordData.family_fill_blanks?.length>0&&<div style={{marginTop:12}}>
              <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:7}}>Examples of each form in context</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {wordData.family_fill_blanks.slice(0,6).map((fb,i)=><div key={i} style={{background:"var(--surface2)",borderRadius:8,padding:"8px 11px",fontSize:12,lineHeight:1.55,color:"var(--ink2)"}}>
                  <span style={{color:"var(--orchid)",fontFamily:"'Geist Mono',monospace",fontSize:10,fontWeight:600,marginRight:6}}>{fb.form}</span>
                  <span style={{fontStyle:"italic"}}>{fb.sentence}</span>
                </div>)}
              </div>
            </div>}
          </div>
        )}
      </div>}
      {tab==="blanks"&&<FillBlanks items={[...(wordData.family_fill_blanks||[]),...(wordData.fill_blanks||[])].slice(0,6)}/>}
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// QUIZ MODE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function QuizMode({wordIndices,wordCache,masteryMap,onComplete,label="Quiz",onLoadMissing,onGenMore}) {
  // Build weighted word pool (lower mastery = more weight)
  const quizWords = useMemo(()=>{
    const wt=[];
    wordIndices.forEach(i=>{const w=AWL_WORDS[i]?.w;if(!w)return;const wg=6-(masteryMap[w]??0);for(let k=0;k<wg;k++)wt.push(i);});
    wt.sort(()=>Math.random()-.5);
    const pk=[],seen=new Set();
    for (const i of wt){if(!seen.has(i)){pk.push(i);seen.add(i);}if(pk.length>=20)break;}
    wordIndices.forEach(i=>{if(!seen.has(i)){pk.push(i);seen.add(i);}});
    return pk.map(i=>AWL_WORDS[i]).filter(Boolean);
  },[]);

  // Phase 1: MC — definition → headword
  const mcQs = useMemo(()=>quizWords.map(w=>{const d=wordCache[w.w]?.definitions?.[0];return d?{word:w.w,def:d.meaning,pos:d.pos}:null}).filter(Boolean),[]);
  const mcOpts = useMemo(()=>mcQs.map(q=>{
    const others=quizWords.filter(w=>w.w!==q.word).map(w=>w.w).sort(()=>Math.random()-.5).slice(0,3);
    return [q.word,...others].sort(()=>Math.random()-.5);
  }),[]);

  // Phase 2: Fill blank — type ANY family form (cycle through all family forms, capped at 3 per word)
  const fbQs = useMemo(()=>{
    const items=[];
    quizWords.forEach(w=>{
      const data=wordCache[w.w]; if(!data) return;
      const fams = data.family_fill_blanks||[];
      if (fams.length>0) {
        // Take up to 3 family entries, prioritizing non-headword forms for variety
        const shuffled = [...fams].sort((a,b)=>{
          const aIsHead = (a.form||a.answer)===w.w?1:0;
          const bIsHead = (b.form||b.answer)===w.w?1:0;
          return aIsHead-bIsHead; // non-headword first
        });
        shuffled.slice(0,3).forEach(fb=>items.push({...fb,headword:w.w}));
      } else if (data.fill_blanks?.[0]) {
        items.push({...data.fill_blanks[0],form:w.w,headword:w.w});
      }
    });
    return items;
  },[]);

  // Phase 3: Family POS MC — given sentence, pick which family form fits (tests word-class awareness)
  const familyMC = useMemo(()=>{
    const items=[];
    quizWords.forEach(w=>{
      const data=wordCache[w.w]; if(!data) return;
      const fams = data.family_fill_blanks||[];
      const family = data.family||[w.w];
      if (fams.length<2||family.length<2) return; // need ≥2 family forms for meaningful choice
      // Pick 1 random family fill-blank with ≥3 family forms available as distractors
      const pool = fams.filter(fb=>fb.form&&fb.answer);
      if (pool.length===0) return;
      const pick = pool[Math.floor(Math.random()*pool.length)];
      const distractors = family.filter(f=>f!==pick.answer).slice(0,3);
      if (distractors.length<2) return;
      const options = [pick.answer,...distractors].sort(()=>Math.random()-.5);
      items.push({headword:w.w,sentence:pick.sentence,answer:pick.answer,options,context:pick.context});
    });
    return items;
  },[]);

  // V6 Phase 4: Collocation cloze — given a typical collocation with one word blanked,
  // pick the natural choice from 4 AWL options of the same POS.
  // Pedagogical goal: train *collocational competence*, the highest-value LR feature.
  //
  // Strategy per word: scan its collocations, prefer blanking the word that is NOT
  // a family member of the headword (user already knows family — too easy).
  // Cap at 1 cloze per word to keep quiz length reasonable.
  const colQs = useMemo(()=>{
    const items = [];
    quizWords.forEach(w => {
      const data = wordCache[w.w]; if (!data) return;
      const cols = data._collocations || [];
      if (cols.length === 0) return;
      // Family forms (lowercased) — used to decide which word in the collocation is "given"
      const famLower = new Set((data.family || [w.w]).map(f => f.toLowerCase()));

      // Try each collocation until we find one with a usable blank
      let chosen = null;
      for (const col of cols) {
        const parts = col.trim().toLowerCase().split(/\s+/);
        if (parts.length < 2 || parts.length > 4) continue;
        let pattern = detectCollocationPattern(col);
        // Skip patterns where blanking is awkward or trivial
        if (pattern === "prep + phrase" || pattern === "single" || !pattern) continue;

        // V6: Confident POS detection per word — check 3 sources in priority:
        //   1. AWL pool membership (strongest signal — explicitly tagged)
        //   2. Suffix match (-ly → adv, -al/ic/ous/ive → adj)
        //   3. unknown (don't use this position as blank)
        const wordPos = (w) => {
          for (const p of ["adj","adv","v","n"]) {
            if (COLLOC_DISTRACTOR_POOL[p].includes(w)) return p;
          }
          if (ADV_SUFFIX.test(w)) return "adv";
          if (ADJ_SUFFIX.test(w) && w.length > 4) return "adj"; // 4-char cutoff to avoid false positives
          return null;
        };
        const posPerWord = parts.map(wordPos);

        // Refine pattern from confident POS data (overrides naive suffix-only detection)
        if (parts.length === 2) {
          const a = posPerWord[0], b = posPerWord[1];
          if (a === "adj" && (b === "n" || b === null)) pattern = "adj + noun";
          else if (a === "adv") pattern = "adv + verb/adj";
          else if (a === "v" && b === "n") pattern = "verb + noun";
          else if (a === "v" && !b) pattern = "verb + prep";
        }

        // Pick blank position with FOUR quality gates:
        //   gate 1: not a stopword (would make a meaningless blank)
        //   gate 2: not a family form (user already knows headword family)
        //   gate 3: has confident POS (for plausible distractors)
        //   gate 4: ≥3 characters (short words are too guessable)
        const candidates = parts.map((p, i) => {
          if (STOPWORDS_FOR_CLOZE.has(p)) return null;
          if (p.length < 3) return null;
          const isFamily = famLower.has(p) || [...famLower].some(ff => ff.length > 3 && p.includes(ff));
          if (isFamily) return null;
          if (!posPerWord[i]) return null;
          return i;
        }).filter(i => i !== null);
        if (candidates.length === 0) continue;

        const blankIdx = candidates[0];
        const answer = parts[blankIdx];
        const posKey = posPerWord[blankIdx];

        const distractors = pickCollocDistractors(answer, posKey, famLower, 3);
        if (distractors.length < 3) continue;
        const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
        // Build display: replace blanked part with "_____"
        const displayed = parts.map((p, i) => i === blankIdx ? "_____" : p).join(" ");
        chosen = {
          headword: w.w,
          original: col,
          displayed,
          answer,
          options,
          pattern,
          blankPos: posKey
        };
        break; // one cloze per word — keep quiz balanced
      }
      if (chosen) items.push(chosen);
    });
    return items;
  },[]);

  const [phase,setPhase]=useState("mc");
  const [qi,setQi]=useState(0);
  const [score,setScore]=useState(0);
  const [ans,setAns]=useState("");
  const [chk,setChk]=useState(false);
  const [results,setResults]=useState([]);
  const [genBusy,setGenBusy]=useState(false);

  // V6: Phase 4 (col) is now part of the totalQ + prog calc
  const totalQ = mcQs.length+fbQs.length+familyMC.length+colQs.length;
  const curArr = phase==="mc"?mcQs:phase==="fb"?fbQs:phase==="famMC"?familyMC:colQs;
  const cur = curArr[qi];
  const prog = phase==="mc"
    ? qi
    : phase==="fb"
      ? mcQs.length+qi
      : phase==="famMC"
        ? mcQs.length+fbQs.length+qi
        : mcQs.length+fbQs.length+familyMC.length+qi;

  if (totalQ===0) {
    const missing = wordIndices.map(i=>AWL_WORDS[i]?.w).filter(w=>w&&!wordCache[w]);
    return <div style={{textAlign:"center",padding:40,color:"var(--ink2)"}}>
      <div style={{fontSize:32,marginBottom:12}}>⏳</div>
      <div style={{marginBottom:14}}>{missing.length>0 ? `${missing.length} word${missing.length>1?"s":""} not loaded yet.` : "No quiz data available."}</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
        {missing.length>0&&onLoadMissing&&<button className="btn bp" disabled={genBusy} onClick={async()=>{
          setGenBusy(true);
          try { await onLoadMissing(missing); } finally { setGenBusy(false); }
        }}>{genBusy?<><Spinner/> Loading {missing.length}...</>:`⚡ Gen quiz now (${missing.length})`}</button>}
        <button className="btn bg" onClick={()=>onComplete([])}>Back</button>
      </div>
    </div>;
  }

  const handleMC = opt=>{
    if (chk) return; setChk(true);
    const ok=opt===cur.word; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.word,form:cur.word,phase:"mc",correct:ok}]);
  };
  const handleFB = ()=>{
    if (chk||!ans.trim()) return; setChk(true);
    const ok=ans.toLowerCase().trim()===cur.answer.toLowerCase(); if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.form||cur.answer,phase:"fb",correct:ok}]);
  };
  const handleFamilyMC = opt=>{
    if (chk) return; setChk(true);
    const ok=opt===cur.answer; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.answer,phase:"famMC",correct:ok}]);
  };
  // V6: handle collocation cloze MC
  const handleCol = opt=>{
    if (chk) return; setChk(true);
    const ok=opt===cur.answer; if (ok) setScore(s=>s+1);
    setResults(r=>[...r,{word:cur.headword,form:cur.answer,phase:"col",correct:ok}]);
  };
  const next=()=>{
    setChk(false);setAns("");
    if (qi+1>=curArr.length) {
      // Phase transition order: mc → fb → famMC → col → result
      if (phase==="mc"&&fbQs.length>0) {setPhase("fb");setQi(0);}
      else if ((phase==="mc"||phase==="fb")&&familyMC.length>0) {setPhase("famMC");setQi(0);}
      else if (phase!=="col"&&colQs.length>0) {setPhase("col");setQi(0);}
      else setPhase("result");
    } else setQi(i=>i+1);
  };

  if (phase==="result") {
    // Group results by headword, count correct/total
    const byWord=results.reduce((a,r)=>{if(!a[r.word])a[r.word]={c:0,t:0,forms:new Set()};a[r.word].t++;if(r.correct)a[r.word].c++;a[r.word].forms.add(r.form);return a},{});
    const phaseStats = results.reduce((a,r)=>{if(!a[r.phase])a[r.phase]={c:0,t:0};a[r.phase].t++;if(r.correct)a[r.phase].c++;return a},{});
    return <div style={{textAlign:"center"}} className="fu">
      <div style={{fontSize:48,marginBottom:8}}>{score>=totalQ*.8?"🏆":score>=totalQ*.5?"💪":"📖"}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:32,color:"var(--ink)",marginBottom:4}}>{score} / {totalQ}</div>
      <div style={{color:"var(--ink3)",marginBottom:18}}>{Math.round(score/totalQ*100)}% correct</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:18}}>
        {phaseStats.mc&&<span className="chip cs">Definition MC: {phaseStats.mc.c}/{phaseStats.mc.t}</span>}
        {phaseStats.fb&&<span className="chip co">Family fill: {phaseStats.fb.c}/{phaseStats.fb.t}</span>}
        {phaseStats.famMC&&<span className="chip cl">Form picker: {phaseStats.famMC.c}/{phaseStats.famMC.t}</span>}
        {phaseStats.col&&<span className="chip ch">Collocation: {phaseStats.col.c}/{phaseStats.col.t}</span>}
      </div>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:13,marginBottom:18,textAlign:"left"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:9}}>Per Word · forms tested</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {Object.entries(byWord).map(([w,s])=><span key={w} className={`chip ${s.c===s.t?"cl":s.c===0?"cr":"ch"}`} title={`Forms: ${[...s.forms].join(", ")}`}>{w} {s.c}/{s.t}<span style={{color:"var(--ink3)",marginLeft:3,fontSize:9}}>({s.forms.size}f)</span></span>)}
        </div>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
        <button className="btn bp" onClick={()=>onComplete(results)}>Done ✓</button>
        {onGenMore&&<button className="btn bs" disabled={genBusy} onClick={async()=>{
          setGenBusy(true);
          try { await onGenMore(quizWords.map(w=>w.w)); } finally { setGenBusy(false); }
        }}>{genBusy?<><Spinner/> Generating...</>:"+ Gen more questions"}</button>}
      </div>
    </div>;
  }

  // Progress + phase label
  const phaseLabel = phase==="mc"?"Definition → Word"
    :phase==="fb"?"Type the family form"
    :phase==="famMC"?"Pick the correct form"
    :"Collocation cloze";
  // V6: dynamic phase counter — total phases depends on which arrays have items
  const activePhases = [mcQs.length>0,fbQs.length>0,familyMC.length>0,colQs.length>0].filter(Boolean).length;
  const phaseNum = phase==="mc"?1:phase==="fb"?2:phase==="famMC"?3:4;
  return <div className="fu">
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:11,color:"var(--ink3)"}}>
        <span>{phaseLabel} <span style={{color:"var(--ink3)",fontSize:10}}>· Phase {phaseNum}/{Math.max(activePhases,1)}</span></span>
        <span>{prog+1}/{totalQ}</span>
      </div>
      <PBar value={prog+1} max={totalQ}/>
    </div>

    {phase==="mc"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)",marginBottom:7}}>Match this definition ({cur.pos})</div>
        <div style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{cur.def}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {mcOpts[qi]?.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.word){bg="rgba(163,230,53,.1)";border="var(--leaf)";col="var(--leaf)";}
            else {bg="rgba(251,113,133,.06)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleMC(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&<button className="btn bp" style={{width:"100%",marginTop:12,justifyContent:"center"}} onClick={next}>Next →</button>}
    </div>}

    {phase==="fb"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--sky)"}}>{cur.context||"family form"}</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>family of: {cur.headword}</div>
        </div>
        <div style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{cur.sentence.replace("___","_______")}</div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <input type="text" value={ans} onChange={e=>setAns(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!chk&&handleFB()} disabled={chk}
          placeholder="Type the exact form..." autoFocus
          style={{borderColor:chk?(ans.toLowerCase().trim()===cur.answer.toLowerCase()?"var(--leaf)":"var(--rose)"):"var(--border2)"}}/>
        <button className="btn bp" onClick={handleFB} disabled={chk||!ans.trim()}>Check</button>
      </div>
      {chk&&(()=>{
        const correct = ans.toLowerCase().trim()===cur.answer.toLowerCase();
        const fd = wordCache[cur.headword]?.family_definitions?.find(f=>f.form===cur.answer);
        return <div>
          <div style={{color:correct?"var(--leaf)":"var(--rose)",fontSize:13,marginBottom:8}}>
            {correct?"✓ Correct!":<>✗ Answer: <strong>{cur.answer}</strong></>}
          </div>
          {fd&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--leaf)",fontWeight:500}}>{fd.form}</span>
              <span className={`pos-pill ${posToClass(fd.pos)}`}>{fd.pos}</span>
            </div>
            <div style={{color:"var(--ink2)",fontSize:11.5,lineHeight:1.5}}>{fd.meaning}</div>
          </div>}
          <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
        </div>;
      })()}
    </div>}

    {phase==="famMC"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--leaf)"}}>Pick the form that fits</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{cur.headword} family</div>
        </div>
        <div style={{color:"var(--ink2)",fontSize:14,lineHeight:1.6}}>{cur.sentence.replace(cur.answer,"_______")}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {cur.options.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.answer){bg="rgba(163,230,53,.1)";border="var(--leaf)";col="var(--leaf)";}
            else {bg="rgba(251,113,133,.06)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleFamilyMC(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace",transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&(()=>{
        const fd = wordCache[cur.headword]?.family_definitions?.find(f=>f.form===cur.answer);
        return <div style={{marginTop:12}}>
          {fd&&<div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--leaf)",fontWeight:500}}>{fd.form}</span>
              <span className={`pos-pill ${posToClass(fd.pos)}`}>{fd.pos}</span>
            </div>
            <div style={{color:"var(--ink2)",fontSize:11.5,lineHeight:1.5}}>{fd.meaning}</div>
          </div>}
          <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
        </div>;
      })()}
    </div>}

    {/* V6: Phase 4 — Collocation cloze */}
    {phase==="col"&&cur&&<div>
      <div style={{background:"var(--surface2)",borderRadius:12,padding:16,marginBottom:13}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,flexWrap:"wrap",gap:5}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--honey)"}}>Which word naturally fits?</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{cur.headword} · {cur.pattern}</div>
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"var(--ink)",lineHeight:1.4,fontStyle:"italic",letterSpacing:-.3,textAlign:"center",padding:"10px 0"}}>{cur.displayed}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {cur.options.map(opt=>{
          let bg="var(--surface2)",border="var(--border2)",col="var(--ink)";
          if (chk){if(opt===cur.answer){bg="rgba(163,230,53,.1)";border="var(--leaf)";col="var(--leaf)";}
            else {bg="rgba(251,113,133,.06)";border="var(--border2)";col="var(--ink3)";}}
          return <button key={opt} onClick={()=>handleCol(opt)} style={{background:bg,border:`1px solid ${border}`,color:col,borderRadius:10,padding:"11px 8px",cursor:chk?"default":"pointer",fontSize:13,fontWeight:500,fontFamily:"'Geist Mono',monospace",transition:"all .13s"}}>{opt}</button>;
        })}
      </div>
      {chk&&<div style={{marginTop:12}}>
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderLeft:"2px solid var(--honey)",borderRadius:8,padding:"10px 13px",marginBottom:10}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--honey)",marginBottom:4}}>Natural collocation</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",fontStyle:"italic",letterSpacing:-.2}}>{cur.original}</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginTop:5,lineHeight:1.5}}>This is the natural pairing in academic English. The other options exist but don't combine as commonly with <strong style={{color:"var(--ink2)"}}>{cur.headword}</strong>.</div>
        </div>
        <button className="btn bp" style={{width:"100%",justifyContent:"center"}} onClick={next}>Next →</button>
      </div>}
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function BandHistoryChart({history}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(()=>{
    if (!canvasRef.current||!history.length) return;
    if (chartRef.current) chartRef.current.destroy();
    const labels = history.slice(-12).map(h=>h.date.slice(5));
    const overall = history.slice(-12).map(h=>h.overall);
    const lr = history.slice(-12).map(h=>h.lr);
    chartRef.current = new Chart(canvasRef.current, {
      type:'line',
      data:{labels,datasets:[
        {label:'Overall',data:overall,borderColor:'#a3e635',backgroundColor:'rgba(163,230,53,.08)',tension:.4,pointRadius:4,borderWidth:2},
        {label:'LR',data:lr,borderColor:'#c084fc',backgroundColor:'rgba(192,132,252,.06)',tension:.4,pointRadius:3,borderWidth:1.5,borderDash:[4,3]}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8a8a98',font:{size:11,family:'Geist'}}}},
        scales:{x:{grid:{color:'#22222b'},ticks:{color:'#4e4e5c',font:{size:10}}},y:{min:4,max:9,grid:{color:'#22222b'},ticks:{color:'#4e4e5c',font:{size:10},stepSize:.5}}}}
    });
    return ()=>chartRef.current?.destroy();
  },[history]);
  if (!history.length) return <div className="empty"><div className="empty-icon">📊</div><div>Grade an essay to see band history.</div></div>;
  return <div style={{height:220}}><canvas ref={canvasRef}/></div>;
}
