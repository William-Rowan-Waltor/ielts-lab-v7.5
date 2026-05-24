function DashboardPage({state,goTo}) {
  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  // V5: streak — DST-safe (addDays), and counts past streak even if today not yet done.
  // Behaviour: if today is done → today counted; else start counting from YESTERDAY backward.
  const streak = useMemo(()=>{
    let s = 0;
    let d = new Date();
    if (!state.completedDays[localDateStr(d)]) d = addDays(d, -1);
    while (state.completedDays[localDateStr(d)]) { s++; d = addDays(d, -1); }
    return s;
  },[state.completedDays]);
  const mastered = Object.values(state.mastery).filter(m=>m>=5).length;
  // V5 FIX: Avg Band — denominator must be the slice length, not full history length.
  // Old: slice(-5).reduce/Math.min(5, length) → wrong when length > 5
  const recentBands = state.bandHistory.slice(-5);
  const avgBand = recentBands.length ? (recentBands.reduce((a,h)=>a+h.overall,0)/recentBands.length).toFixed(1) : "—";
  const priorityCount = state.priorityWords.length;
  // V5: real progress today (target + extra) from dailyStats
  const todayStats = state.dailyStats?.[today] || {target:0, extra:0, words:[]};
  const todayWordsLearned = todayStats.words?.length || 0;

  return <div className="fu">
    <div className="kicker">IELTS Writing Lab · Dashboard</div>
    <h1 className="title-x">Your <em>Progress</em></h1>

    <div className="cols-4">
      {[
        {v:`${streak}🔥`,l:"Streak",cl:""},
        {v:mastered,l:"AWL Mastered",cl:"sc-sky"},
        {v:avgBand,l:"Avg Band",cl:"sc-orchid"},
        {v:state.bandHistory.length,l:"Essays Graded",cl:"sc-honey"}
      ].map(s=>
        <div key={s.l} className={`card stat-card ${s.cl}`} style={{textAlign:"center"}}>
          <div className="sv">{s.v}</div><div className="sl">{s.l}</div>
        </div>
      )}
    </div>

    <div className="cols-2">
      <div className="card">
        <div className="card-h"><div className="cdot"/>{todayDone?"Today · Done ✓":"Today's Task"}</div>
        {todayDone
          ? <div>
              <div style={{textAlign:"center",padding:"4px 0 10px",color:"var(--leaf)"}}>Daily target done! 🎓</div>
              {/* V5: show real progress + offer to keep learning */}
              <div style={{fontSize:11,color:"var(--ink3)",textAlign:"center",marginBottom:8}}>
                Learned today: <strong style={{color:"var(--ink2)"}}>{todayWordsLearned}</strong> word{todayWordsLearned===1?"":"s"}
                {todayStats.extra>0 && <span style={{color:"var(--honey)",marginLeft:6}}>· +{todayStats.extra} extra 🚀</span>}
              </div>
              <button className="btn bl bsm" style={{width:"100%",justifyContent:"center"}} onClick={()=>goTo("vocab")}>
                Continue learning →
              </button>
            </div>
          : todayEntry
            ? <div>
                <div style={{color:"var(--ink)",fontSize:14,fontWeight:500,marginBottom:4}}>
                  {todayEntry.type==="review7"?"📚 Weekly Review":todayEntry.type==="review3"?"🔄 3-Day Review":`📖 ${todayEntry.wordIndices?.length||state.wordsPerDay||3} New Words`}
                </div>
                <div style={{color:"var(--ink3)",fontSize:11,marginBottom:12}}>
                  {todayEntry.type==="learn"?`Words: ${todayEntry.wordIndices.map(i=>AWL_WORDS[i]?.w).join(", ")}`:`${todayEntry.wordIndices.length} words to review`}
                </div>
                <button className="btn bp bsm" onClick={()=>goTo("vocab")}>Start →</button>
              </div>
            : <div style={{color:"var(--ink3)"}}>You've completed all 570 words! 🎓</div>
        }
        {/* V5: priority shows regardless of todayDone — power users want to push further */}
        {priorityCount > 0 && <div className="alert ag mt8" style={{marginBottom:0}}>
          ✦ {priorityCount} priority vocab words from your essays → <span onClick={()=>goTo("vocab")} style={{cursor:"pointer",textDecoration:"underline"}}>Boost session</span>
        </div>}
      </div>
      <div className="card">
        <div className="card-h"><div className="cdot"/>AWL Progress</div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--ink3)",marginBottom:5}}>
          <span>Mastered</span><span style={{color:"var(--leaf)"}}>{mastered} / 570</span>
        </div>
        <PBar value={mastered} max={570}/>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--ink3)",marginTop:9,marginBottom:5}}>
          <span>Total learned</span><span>{Object.keys(state.mastery).length} / 570</span>
        </div>
        <PBar value={Object.keys(state.mastery).length} max={570} color="var(--sky)"/>
      </div>
    </div>

    {/* V6 NEW: 14-day learning heatmap from dailyStats (real progress, not just done/not-done) */}
    <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Last 14 Days · Real Learning</div>
      <LearningHeatmap dailyStats={state.dailyStats||{}} wordsPerDay={state.wordsPerDay||3}/>
    </div>

    {/* V6 NEW: Revision Queue — graded essays due to be re-written */}
    {(()=>{
      const due = getDueRevisits(state.essays||[]);
      const upcoming = getUpcomingRevisits(state.essays||[]);
      if (due.length === 0 && upcoming.length === 0) return null;
      return <div className="card mt14" style={due.length>0?{borderLeft:"2px solid var(--orchid)"}:{}}>
        <div className="card-h"><div className="cdot" style={{background:"var(--orchid)"}}/>🔁 Revision Queue {due.length>0&&<span style={{fontSize:10,color:"var(--orchid)",marginLeft:6,fontFamily:"'Geist Mono',monospace",letterSpacing:".05em"}}>· {due.length} due</span>}</div>
        {due.length > 0 && <div style={{marginBottom:upcoming.length>0?11:0}}>
          <div style={{fontSize:11,color:"var(--ink3)",marginBottom:7}}>Write each one again from scratch, then compare bands:</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {due.slice(0,3).map(e=>{
              const daysOverdue = Math.floor((Date.now()-e.revisitDue)/DAY_MS);
              return <div key={e.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:"var(--surface2)",borderRadius:7,border:"1px solid var(--border)"}}>
                <span style={{fontFamily:"'Fraunces',serif",fontSize:15,color:bandColor(e.gradeResult.overall),fontWeight:500,flexShrink:0}}>{e.gradeResult.overall.toFixed(1)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11.5,color:"var(--ink2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(e.promptText||"(no prompt)").slice(0,80)}</div>
                  <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)",marginTop:2}}>{e.date} · {daysOverdue===0?"due today":`${daysOverdue}d overdue`}</div>
                </div>
                <button className="btn bp bsm" onClick={()=>goTo("practice")} style={{flexShrink:0}}>Revisit →</button>
              </div>;
            })}
            {due.length > 3 && <div style={{fontSize:10.5,color:"var(--ink3)",textAlign:"center",fontStyle:"italic",marginTop:3}}>+ {due.length-3} more in Writing → Archive → Revisit due</div>}
          </div>
        </div>}
        {upcoming.length > 0 && <div>
          <div style={{fontSize:10.5,color:"var(--ink3)",fontStyle:"italic"}}>📅 {upcoming.length} more coming up this week</div>
        </div>}
      </div>;
    })()}

    <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Band Score History</div>
      <BandHistoryChart history={state.bandHistory}/>
    </div>

    {state.bandHistory.length > 0 && <div className="card mt14">
      <div className="card-h"><div className="cdot"/>Recent Sessions</div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {state.bandHistory.slice(-5).reverse().map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:8,background:"var(--surface2)"}}>
          <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--ink3)"}}>{h.date}</span>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:18,color:bandColor(h.overall),letterSpacing:-.02,marginLeft:"auto"}}>{h.overall.toFixed(1)}</span>
          {["ta","cc","lr","gra"].map(k=><span key={k} style={{fontFamily:"'Geist Mono',monospace",fontSize:9,color:"var(--ink3)"}}>{k.toUpperCase()}: <span style={{color:bandColor(h[k])}}>{h[k]}</span></span>)}
        </div>)}
      </div>
    </div>}
  </div>;
}

// V5: 14-day learning heatmap. Renders one cell per day showing how many words user
// actually learned (target + extra). Color intensity scales with count.
function LearningHeatmap({dailyStats, wordsPerDay}) {
  const cells = [];
  const target = Math.max(1, wordsPerDay);
  for (let i = 13; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const key = localDateStr(d);
    const stat = dailyStats[key];
    const count = stat?.words?.length || 0;
    const extra = stat?.extra || 0;
    // Intensity: 0 = empty, target-met = mid, target+extra = bright
    let bg, label;
    if (count === 0) { bg = "var(--surface2)"; label = "—"; }
    else if (count < target) { bg = "rgba(251,191,36,.25)"; label = `${count}`; }
    else if (extra === 0) { bg = "rgba(163,230,53,.45)"; label = `${count}`; }
    else { bg = "rgba(163,230,53,.85)"; label = `${count}🚀`; }
    cells.push({key, label, bg, count, extra, isToday: i===0, day: d.getDate()});
  }
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(14,1fr)",gap:4,marginBottom:8}}>
      {cells.map(c=>
        <div key={c.key} title={`${c.key}: ${c.count} words${c.extra?` (+${c.extra} extra)`:""}`}
             style={{aspectRatio:"1",borderRadius:5,background:c.bg,border:c.isToday?"1.5px solid var(--leaf)":"1px solid var(--border)",
                     display:"flex",alignItems:"center",justifyContent:"center",fontSize:9.5,fontFamily:"'Geist Mono',monospace",
                     color:c.count>0?"var(--bg)":"var(--ink3)",fontWeight:c.count>0?700:400}}>
          {c.label}
        </div>
      )}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace"}}>
      <span>14 days ago</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"rgba(251,191,36,.25)",borderRadius:2,display:"inline-block"}}/>partial</span>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"rgba(163,230,53,.45)",borderRadius:2,display:"inline-block"}}/>on target</span>
        <span style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{width:9,height:9,background:"rgba(163,230,53,.85)",borderRadius:2,display:"inline-block"}}/>+ extra 🚀</span>
      </div>
      <span>today</span>
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: VOCAB (AWL DAILY)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
