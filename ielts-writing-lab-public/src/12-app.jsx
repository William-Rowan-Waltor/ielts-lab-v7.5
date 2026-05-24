const NAV_ITEMS = [
  {id:"dashboard",icon:"◈",label:"Dashboard"},
  {id:"vocab",icon:"✦",label:"Vocab"},
  {id:"theory",icon:"§",label:"Theory"},
  {id:"practice",icon:"◎",label:"Writing"},
  {id:"reading",icon:"R",label:"Reading"},
  {id:"settings",icon:"⚙",label:"Settings"}
];

function App() {
  const [page,setPage] = useState("dashboard");
  const [state,setStateRaw] = useState(()=>loadState());
  const [configs,setConfigsRaw] = useState(()=>loadConfigs());
  const [activeId,setActiveIdRaw] = useState(()=>loadActiveId());
  const config = useMemo(()=>configs.find(c=>c.id===activeId)||null,[configs,activeId]);

  const [folderStorage,setFolderStorage] = useState(()=>{
    const enabled = canUseFolderStorage();
    return {enabled,ready:!enabled,status:enabled?`Syncing ${STORAGE_FILE_LABEL}...`:"Browser localStorage",path:STORAGE_FILE_LABEL};
  });
  const folderStorageLoadedRef = useRef(!canUseFolderStorage());

  useEffect(()=>{
    if (!canUseFolderStorage()) return;
    let cancelled = false;
    (async()=>{
      try {
        const bundle = await loadFolderStorage();
        if (cancelled) return;
        if (bundle) {
          const applied = applyStorageBundle(bundle);
          if (applied) {
            setStateRaw(applied.state);
            setConfigsRaw(applied.configs);
            setActiveIdRaw(applied.activeId);
          }
          setFolderStorage({enabled:true,ready:true,status:`Loaded ${STORAGE_FILE_LABEL}`,path:STORAGE_FILE_LABEL});
        } else {
          await saveFolderStorage(makeStorageBundle(state,configs,activeId));
          if (!cancelled) setFolderStorage({enabled:true,ready:true,status:`Created ${STORAGE_FILE_LABEL}`,path:STORAGE_FILE_LABEL});
        }
      } catch(e) {
        if (!cancelled) setFolderStorage({enabled:true,ready:false,status:`Folder sync error: ${e.message}`,path:STORAGE_FILE_LABEL});
      } finally {
        folderStorageLoadedRef.current = true;
      }
    })();
    return ()=>{ cancelled = true; };
  },[]);

  useEffect(()=>{
    if (!canUseFolderStorage() || !folderStorageLoadedRef.current) return;
    const id = setTimeout(()=>{
      saveFolderStorage(makeStorageBundle(state,configs,activeId))
        .then(()=>setFolderStorage(s=>({...s,enabled:true,ready:true,status:`Saved ${STORAGE_FILE_LABEL} ${new Date().toLocaleTimeString()}`})))
        .catch(e=>setFolderStorage(s=>({...s,enabled:true,ready:false,status:`Folder sync error: ${e.message}`})));
    },400);
    return ()=>clearTimeout(id);
  },[state,configs,activeId]);


  // Setters that persist to localStorage automatically (single source of truth).
  // Support BOTH object and functional updater forms — functional form is required for
  // race-safe concurrent updates (e.g. quiz batch-loading missing words).
  const setState = (ns) => {
    if (typeof ns === 'function') {
      setStateRaw(prev => { const next = ns(prev); saveState(next); return next; });
    } else { setStateRaw(ns); saveState(ns); }
  };
  const setConfigs = (nc) => {
    if (typeof nc === 'function') {
      setConfigsRaw(prev => { const next = nc(prev); saveConfigs(next); return next; });
    } else { setConfigsRaw(nc); saveConfigs(nc); }
  };
  const setActiveId = (id) => {
    if (typeof id === 'function') {
      setActiveIdRaw(prev => { const next = id(prev); saveActiveId(next); return next; });
    } else { setActiveIdRaw(id); saveActiveId(id); }
  };

  const today = TODAY();
  const schedule = useMemo(()=>getSchedule(state.startDate, state.wordsPerDay, state.activeSublists),[state.startDate, state.wordsPerDay, state.activeSublists]);
  const todayEntry = schedule.find(d=>d.date===today);
  const todayDone = !!state.completedDays[today];
  const hasPriority = state.priorityWords.length > 0;
  // V6: surface revision queue in nav
  const dueRevisitCount = useMemo(()=>getDueRevisits(state.essays||[]).length,[state.essays]);

  const pageTitle = {dashboard:"Dashboard",vocab:"Vocab · AWL",theory:"Theory · Guide",practice:"Writing",reading:"Reading",settings:"Settings"}[page];

  return <div className="app">
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-tag">IELTS Academic</div>
        <div className="brand-name">Writing <em>Lab</em> ✦</div>
      </div>
      <div className="nav-group">
        <div className="nav-label">Main</div>
        {NAV_ITEMS.filter(n=>n.id!=="settings").map(n=><div key={n.id} className={`ni ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic"}}>{n.icon}</span>
          {n.label}
          {n.id==="vocab"&&((!todayDone&&todayEntry)||hasPriority)&&<span className="ni-badge">{hasPriority?"boost":"today"}</span>}
          {n.id==="practice"&&dueRevisitCount>0&&<span className="ni-badge" style={{background:"rgba(192,132,252,.15)",color:"var(--orchid)"}}>🔁{dueRevisitCount}</span>}
          <div className="ni-dot"/>
        </div>)}
      </div>
      <div className="nav-group">
        <div className="nav-label">Config</div>
        <div className={`ni ${page==="settings"?"active":""}`} onClick={()=>setPage("settings")}>
          <span style={{fontFamily:"'Fraunces',serif",fontSize:14,fontStyle:"italic"}}>⚙</span>Settings
          {!config&&<span className="ni-badge" style={{background:"rgba(251,113,133,.15)",color:"var(--rose)"}}>!key</span>}
          <div className="ni-dot"/>
        </div>
      </div>
      <div className="sfooter">
        <span style={{color:"var(--ink2)"}}>AWL</span> {Object.keys(state.mastery).length}/570<br/>
        <span style={{color:"var(--ink2)"}}>Daily</span> {state.wordsPerDay||3} w · Sub {(state.activeSublists||[]).join(",")}<br/>
        {config?<><span style={{color:"var(--ink2)"}}>AI</span> {config.name}</>:<span style={{color:"var(--rose)"}}>⚠ No AI config</span>}<br/>
        <span style={{color:"var(--ink2)"}}>Band</span> target {state.targetBand||7.0}<br/>
        <span style={{color:"var(--ink2)"}}>Storage</span> {folderStorage.enabled?(folderStorage.ready?"folder":"syncing"):"browser"}<br/>
        <span style={{color:"var(--ink2)"}}>Archive</span> {(state.essays||[]).length} essay{(state.essays||[]).length===1?"":"s"}<br/>
        <span style={{color:"var(--ink2)"}}>Reading</span> {(state.readingTests||[]).length} attempt{(state.readingTests||[]).length===1?"":"s"}
      </div>
    </nav>

    <main className="main">
      <div className="topbar">
        <div className="crumb">Writing Lab · <strong>{pageTitle}</strong></div>
        <div className="target-badge" onClick={()=>setPage("settings")}>TARGET {state.targetBand||7.0}</div>
      </div>
      {page==="dashboard"&&<DashboardPage state={state} goTo={setPage}/>}
      {page==="vocab"&&<VocabPage state={state} setState={setState} config={config}/>}
      {page==="theory"&&<TheoryPage/>}
      {page==="practice"&&<PracticePage state={state} setState={setState} config={config}/>}
      {page==="reading"&&<ReadingPage state={state} setState={setState} config={config}/>}
      {page==="settings"&&<SettingsPage state={state} setState={setState} configs={configs} setConfigs={setConfigs} activeId={activeId} setActiveId={setActiveId}/>}
    </main>

    <nav className="bn">
      {NAV_ITEMS.map(n=><div key={n.id} className={`bni ${page===n.id?"active":""}`} onClick={()=>setPage(n.id)}>
        <div className="bni-icon">{n.icon}</div>{n.label}
      </div>)}
    </nav>
  </div>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
