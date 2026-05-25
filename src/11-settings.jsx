function SharedStorageBanner({setState, setConfigs, setActiveId}) {
  const isShared = canUseFolderStorage();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const reloadFromFile = async () => {
    if (!isShared) return;
    if (!window.confirm("Tải lại data từ data/app-state.json sẽ ghi đè state hiện tại trong browser này. Tiếp tục?")) return;
    setBusy(true); setStatus("Đang tải...");
    try {
      const bundle = await loadFolderStorage();
      if (!bundle) { setStatus("File chưa tồn tại — chưa có gì để tải."); setBusy(false); return; }
      const applied = applyStorageBundle(bundle);
      if (applied) {
        setState(applied.state);
        setConfigs(applied.configs);
        setActiveId(applied.activeId);
        const ts = new Date(bundle.updatedAt || bundle.savedAt || Date.now()).toLocaleString();
        setStatus(`✓ Đã tải xong (file cập nhật ${ts}). Reload trang để UI làm mới đầy đủ.`);
      }
    } catch(e) { setStatus(`Lỗi: ${e.message}`); }
    setBusy(false);
  };

  if (!isShared) {
    return <div className="alert aw" style={{marginBottom:11,fontSize:11.5,lineHeight:1.55}}>
      <strong>⚠ Đang dùng Browser-only mode</strong> ({location.protocol}{location.host?"//"+location.host:""}). Mỗi browser có data riêng — không sync giữa Edge / Chrome / Firefox.<br/>
      <strong style={{color:"var(--leaf)"}}>Để share data giữa tất cả browser:</strong> đóng tab này, chạy <code style={{background:"var(--surface2)",padding:"1px 6px",borderRadius:4}}>node scripts/serve.mjs</code> trong folder project, rồi mở <code style={{background:"var(--surface2)",padding:"1px 6px",borderRadius:4}}>http://localhost:5173</code>. Mọi browser mở URL này sẽ đọc/ghi cùng file <code>data/app-state.json</code>.
    </div>;
  }
  return <div className="alert ag" style={{marginBottom:11,fontSize:11.5,lineHeight:1.55}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:200}}>
        <strong>✓ Shared storage mode</strong> — tất cả browser mở <code style={{background:"var(--surface2)",padding:"1px 6px",borderRadius:4}}>{location.origin}</code> đọc/ghi cùng file <code>data/app-state.json</code>. State tự động save sau mỗi thay đổi (debounce 400ms).<br/>
        <span style={{color:"var(--ink3)"}}>Lưu ý: nếu mở app trong 2 browser cùng lúc và sửa song song, browser save sau sẽ ghi đè browser save trước. Bấm "Reload from file" để pull data mới nhất khi switch browser.</span>
      </div>
      <button className="btn bs bsm" onClick={reloadFromFile} disabled={busy} style={{flexShrink:0}}>{busy?"...":"⟳ Reload from file"}</button>
    </div>
    {status&&<div style={{marginTop:6,fontSize:11,color:"var(--ink2)"}}>{status}</div>}
  </div>;
}

function SettingsPage({state,setState,configs,setConfigs,activeId,setActiveId}) {
  // Build initial form from a preset (fixes bug where default form.format='openai' overrode preset)
  const buildFormFromPreset = (pid) => {
    const p = PRESETS[pid]||{};
    return {preset:pid,key:"",name:p.name||"",url:p.url||"",model:p.model||"",format:p.format||"openai"};
  };
  const [form,setForm] = useState(()=>buildFormFromPreset("gemini"));
  const [testing,setTesting] = useState(false);
  const [testMsg,setTestMsg] = useState("");
  const [showCustom,setShowCustom] = useState(false);
  const [rawResponse,setRawResponse] = useState("");
  const targetBand = state.targetBand||7.0;

  const handlePreset = (pid) => {
    setForm(f=>({...buildFormFromPreset(pid),key:f.key})); // preserve user's typed key
    setShowCustom(pid==="custom");
  };

  // Auto-correct format based on URL (safety net — prevents future bugs from breaking configs)
  const autoCorrectFormat = (cfg) => {
    if (cfg.url?.includes("generativelanguage.googleapis.com")) cfg.format = "gemini";
    else if (cfg.url?.includes("api.anthropic.com")) cfg.format = "anthropic";
    return cfg;
  };

  const addConfig = async () => {
    const p = PRESETS[form.preset]||{};
    let cfg = {
      id:Date.now().toString(),
      name:form.name||p.name||"Custom",
      url:form.url||p.url,
      model:form.model||p.model,
      format:form.preset==="custom" ? (form.format||"openai") : (p.format||form.format||"openai"),
      key:form.key.trim()
    };
    cfg = autoCorrectFormat(cfg);
    if (!cfg.key) { setTestMsg("⚠ Enter an API key"); return; }
    if (!cfg.url) { setTestMsg("⚠ URL is required"); return; }
    if (!cfg.model && cfg.format!=="gemini") { setTestMsg("⚠ Model name is required"); return; }
    setTesting(true); setTestMsg(`Testing ${cfg.format} format @ ${cfg.url.slice(0,40)}...`); setRawResponse("");
    try {
      const result = await callAPI(cfg,[{role:"user",content:"Reply with exactly: OK"}],30);
      const preview = (result||"(empty response)").trim().slice(0,80);
      setRawResponse(preview);
      setConfigs(prev => [...prev, cfg]);
      setActiveId(cfg.id);
      setTestMsg(`✓ Connected! Format=${cfg.format}. Saved & set as active.`);
      setForm(buildFormFromPreset("gemini"));
      setShowCustom(false);
    } catch(e) { setTestMsg(`✗ ${e.message} · format=${cfg.format}`); }
    finally { setTesting(false); }
  };

  const removeConfig = (id) => {
    if (!window.confirm("Remove this config?")) return;
    const nc=configs.filter(c=>c.id!==id); setConfigs(nc);
    if (activeId===id) setActiveId(null);
  };
  const setActive = (id) => setActiveId(id);

  // Fix broken existing configs (one-click migration)
  const fixExistingConfigs = () => {
    const fixed = configs.map(c=>autoCorrectFormat({...c}));
    setConfigs(fixed);
    setTestMsg("✓ Configs format auto-corrected based on URLs. Try again.");
  };
  const hasBroken = configs.some(c=>c.url?.includes("generativelanguage")&&c.format!=="gemini");

  const saveTargetBand = (b) => setState({...state,targetBand:b});
  const saveExamDate = (d) => setState({...state,examDate:d||null});

  const resetVocab = () => { if (window.confirm("Reset all vocab progress? This cannot be undone.")) setState({...state,mastery:{},completedDays:{},wordCache:{},priorityWords:[],startDate:TODAY(),dailyStats:{}}); };

  const exportAllData = () => {
    const bundle = makeStorageBundle(state, configs, activeId);
    const blob = new Blob([JSON.stringify(bundle,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-writing-lab-backup-${TODAY()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importAllData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const applied = applyStorageBundle(JSON.parse(String(reader.result||"{}")));
        if (!applied) throw new Error("Bad backup file");
        setState(applied.state);
        setConfigs(applied.configs);
        setActiveId(applied.activeId);
        alert("Imported app data. If you are running via node scripts\\serve.mjs, it will sync into data/app-state.json automatically.");
      } catch(err) {
        alert("Import failed: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };


  const curPreset = PRESETS[form.preset]||{};

  return <div className="canvas fu">
    <div className="kicker">Settings</div>
    <h1 className="title-x">Configure <em>Lab</em></h1>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Goal</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[5.5,6.0,6.5,7.0,7.5,8.0].map(b=><button key={b} className={`btn ${targetBand===b?"bp":"bg"} bsm`} onClick={()=>saveTargetBand(b)}>Band {b}</button>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:14}}>
        <div className="field-label" style={{margin:0}}>Exam date (optional):</div>
        <input type="date" value={state.examDate||""} onChange={e=>saveExamDate(e.target.value)}
          style={{background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--ink)",padding:"6px 10px",borderRadius:6,fontSize:13,fontFamily:"inherit"}}/>
        {state.examDate&&<span style={{fontSize:11,color:"var(--ink3)"}}>{Math.max(0,Math.ceil((new Date(state.examDate)-new Date())/DAY_MS))} days left</span>}
      </div>
      <div style={{marginBottom:14}}>
        <div className="field-label" style={{marginBottom:6}}>Personal writing goal (free-text, optional)</div>
        <textarea value={state.writingGoal||""} onChange={e=>setState({...state,writingGoal:e.target.value})}
          placeholder="e.g. 'I struggle linking ideas with cohesion'  ·  'Need more advanced vocab in Task 2'  ·  'Want to nail the overview sentence'"
          style={{width:"100%",minHeight:60,background:"var(--surface2)",border:"1px solid var(--border)",color:"var(--ink)",padding:9,borderRadius:6,fontSize:12.5,fontFamily:"inherit",resize:"vertical",lineHeight:1.5}}/>
        <div style={{fontSize:10.5,color:"var(--ink3)",marginTop:4}}>Injected into question generation + essay grading prompts for personalized output.</div>
      </div>
      <div>
        <div className="field-label" style={{marginBottom:6}}>Feedback style</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {id:"coach",label:"🎯 Coach",desc:"Encouraging, analogy-rich, explains why"},
            {id:"direct",label:"⚡ Direct",desc:"Terse, just facts, no fluff"},
            {id:"examiner",label:"📋 Examiner",desc:"Formal IELTS band-descriptor language"}
          ].map(opt=>{
            const active = (state.feedbackStyle||"coach")===opt.id;
            return <button key={opt.id} className={`btn ${active?"bp":"bg"} bsm`} onClick={()=>setState({...state,feedbackStyle:opt.id})} title={opt.desc}>{opt.label}</button>;
          })}
        </div>
        <div style={{fontSize:10.5,color:"var(--ink3)",marginTop:4}}>{({coach:"Coach: encouraging, explains the why",direct:"Direct: just the facts, no fluff",examiner:"Examiner: formal band-descriptor language"})[state.feedbackStyle||"coach"]}</div>
      </div>
    </div>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Vocab Schedule</div>

      <div style={{marginBottom:14}}>
        <div className="field-label" style={{marginBottom:6}}>Daily Session Size</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[3,5,7,10,15,20].map(n=><button key={n} className={`btn ${(state.wordsPerDay||3)===n?"bp":"bg"} bsm`} onClick={()=>setState({...state,wordsPerDay:n})}>{n} words/day</button>)}
        </div>
        <div style={{fontSize:11,color:"var(--ink3)",marginTop:6}}>Currently: <strong style={{color:"var(--ink2)"}}>{state.wordsPerDay||3}</strong> new words mỗi ngày học (review days vẫn full).</div>
      </div>

      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:6}}>
          <div className="field-label">Active Sublists ({(state.activeSublists||[]).length}/10)</div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn bs bsm" onClick={()=>setState({...state,activeSublists:[1,2,3]})}>IELTS Focus (1-3)</button>
            <button className="btn bg bsm" onClick={()=>setState({...state,activeSublists:[1,2,3,4,5,6,7,8,9,10]})}>All</button>
          </div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[1,2,3,4,5,6,7,8,9,10].map(n=>{
            const active = (state.activeSublists||[]).includes(n);
            return <button key={n} className={`sublist-btn ${active?"active":""}`} onClick={()=>{
              const cur = state.activeSublists||[];
              const next = active ? cur.filter(x=>x!==n) : [...cur,n].sort((a,b)=>a-b);
              if (next.length===0) { alert("Phải có ít nhất 1 sublist active"); return; }
              setState({...state,activeSublists:next});
            }}>Sub {n}{active?" ✓":""}</button>;
          })}
        </div>
        <div style={{fontSize:11,color:"var(--ink3)",marginTop:8,lineHeight:1.5}}>
          Schedule chỉ lấy từ sublists đã chọn. <strong style={{color:"var(--ink2)"}}>Sub 1-3</strong> là quan trọng nhất cho IELTS (180 từ phổ biến nhất).
          Đổi sublists giữa chừng không mất tiến độ — mastery vẫn được giữ.
        </div>
      </div>
    </div>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>AI Configurations ({configs.length})</div>
      {hasBroken&&<div className="alert aw mb14" style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
        <span>⚠ Detected configs with wrong format (Gemini URL but openai format). This breaks fetch.</span>
        <button className="btn bp bsm" onClick={fixExistingConfigs}>Auto-fix</button>
      </div>}
      {configs.length===0&&<div className="empty" style={{padding:24}}><div className="empty-icon">🔑</div><div style={{fontSize:12}}>No AI config yet. Add one below. <strong style={{color:"var(--leaf)"}}>Gemini</strong> is free with no card required.</div></div>}
      {configs.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:8,background:activeId===c.id?"rgba(163,230,53,.07)":"var(--surface2)",border:`1px solid ${activeId===c.id?"rgba(163,230,53,.25)":"var(--border)"}`,marginBottom:7}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:activeId===c.id?"var(--leaf)":"var(--border2)",flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12.5,color:"var(--ink)",fontWeight:500}}>{c.name} <span style={{color:c.url?.includes("generativelanguage")&&c.format!=="gemini"?"var(--rose)":"var(--ink3)",fontFamily:"'Geist Mono',monospace",fontSize:9,marginLeft:3}}>· {c.format}</span></div>
          <div style={{fontSize:10,color:"var(--ink3)",fontFamily:"'Geist Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.model||"—"}</div>
        </div>
        <button className="btn bs bsm" onClick={()=>setActive(c.id)} disabled={activeId===c.id}>{activeId===c.id?"Active ✓":"Set Active"}</button>
        <button className="btn bg bsm" onClick={()=>removeConfig(c.id)} title="Remove">✕</button>
      </div>)}
    </div>
    <div className="card mb14">
      <div className="card-h"><div className="cdot"/>Add New API Config</div>
      <div className="alert ag mb14" style={{display:"flex",alignItems:"flex-start",gap:8}}>
        <span style={{fontSize:14}}>✦</span>
        <div>
          <strong style={{color:"var(--leaf)"}}>✓ Chắc chắn dùng được từ VN (chỉ cần email):</strong> <strong>Gemini</strong> (15 rpm, 1500/day, 1M TPM — đủ cho full test) · <strong>Gemini 2.5 Pro</strong> (chất lượng cao hơn, 5 rpm) · <strong>Groq</strong> (nhanh nhưng 30 rpm + 6k TPM hơi chật cho full test) · <strong>OpenRouter</strong> (free :free models, 50/day) · <strong>DeepSeek</strong> (paid nhưng rất rẻ ~$0.14/M tokens, đăng ký dễ).
          <br/><strong style={{color:"var(--honey)"}}>⚠ Đa số provider Mỹ khác (Cerebras, SambaNova, Together, NVIDIA, OpenAI, Anthropic, Mistral, xAI...) yêu cầu số điện thoại Mỹ hoặc verification phức tạp — thường KHÔNG dùng được từ VN.</strong>
          <br/><strong style={{color:"var(--sky)"}}>Khuyến nghị cho Reading full test (12+ API calls):</strong> dùng <strong>Gemini 2.0 Flash</strong> (1M TPM thoải mái) hoặc <strong>Gemini 2.5 Pro</strong> (chất lượng tốt hơn, đợi giữa các call). Nếu cần chất lượng tối đa và sẵn sàng trả phí: <strong>DeepSeek-Chat</strong> (~$0.50/full test).
        </div>
      </div>
      <div className="field"><div className="field-label">Provider Preset</div>
        <select value={form.preset} onChange={e=>handlePreset(e.target.value)}>
          {Object.entries(PRESETS).map(([k,p])=><option key={k} value={k}>{p.name}{k==="gemini"?" ✓ VN · free · recommended":""}{k==="gemini_pro"?" ✓ VN · free · larger context":""}{k==="groq"?" ✓ VN · free · 30 rpm limit":""}{k==="openrouter"?" ✓ VN · free :free models · 50/day":""}{k==="zhipu"?" ✓ VN · free GLM-4-Flash · Chinese UI":""}{k==="deepseek"?" ✓ VN · paid · very cheap":""}{k==="kimi"?" ✓ VN · paid · balance needed":""}{k==="together"?" ⚠ may need US phone":""}{k==="nvidia"?" ⚠ may need verification":""}{k==="hyperbolic"?" ⚠ may need verification":""}{k==="cerebras"?" ✗ US phone required":""}{k==="sambanova"?" ✗ US verification required":""}{k==="mistral"?" ⚠ EU signup":""}{k==="anthropic"?" ⚠ paid · may be region-restricted":""}{k==="xai"?" ⚠ paid · may need verification":""}{k==="openai"?" ⚠ paid · may need US phone":""}</option>)}
        </select>
      </div>
      {curPreset.link&&<div className="alert ai" style={{marginBottom:11}}>
        Get API key: <a href={curPreset.link} target="_blank" rel="noopener" style={{color:"var(--sky)",textDecoration:"underline"}}>{curPreset.link.replace(/^https?:\/\//,"")}</a>
      </div>}
      <div className="field"><div className="field-label">API Key</div>
        <input type="password" value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))} placeholder="Paste your API key here..." autoComplete="off"/>
      </div>
      {showCustom&&<>
        <div className="alert aw" style={{marginBottom:11}}>⚙ Custom mode — configure endpoint manually. Choose format matching your API.</div>
        <div className="field"><div className="field-label">Config Name</div>
          <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="My Custom Provider"/>
        </div>
        <div className="field"><div className="field-label">API URL (endpoint)</div>
          <input type="text" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://api.example.com/v1/chat/completions"/>
        </div>
        <div className="field"><div className="field-label">Model Name</div>
          <input type="text" value={form.model} onChange={e=>setForm(f=>({...f,model:e.target.value}))} placeholder="llama-3.1-70b / gpt-4o-mini / etc."/>
        </div>
        <div className="field"><div className="field-label">Request Format</div>
          <select value={form.format} onChange={e=>setForm(f=>({...f,format:e.target.value}))}>
            <option value="openai">OpenAI-compatible (most providers)</option>
            <option value="gemini">Gemini (Google AI Studio)</option>
            <option value="anthropic">Anthropic (Claude direct)</option>
          </select>
        </div>
      </>}
      <button className="btn bp" onClick={addConfig} disabled={testing}>{testing?<><Spinner/> Testing...</>:"✦ Add & Test Config"}</button>
      {testMsg&&<div className={`alert ${testMsg.startsWith("✓")?"ag":testMsg.startsWith("⚠")?"aw":testMsg.startsWith("Testing")?"ai":"ar"} mt8`} style={{marginBottom:0}}>{testMsg}</div>}
      {rawResponse&&<div style={{marginTop:8,padding:"9px 12px",background:"var(--surface2)",borderRadius:7,border:"1px solid var(--border2)"}}>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".1em",textTransform:"uppercase",color:"var(--ink3)",marginBottom:4}}>Raw response (first 80 chars)</div>
        <div style={{fontFamily:"'Geist Mono',monospace",fontSize:11,color:"var(--ink2)",wordBreak:"break-word"}}>{rawResponse}</div>
      </div>}
    </div>
    <div className="card">
      <div className="card-h"><div className="cdot"/>Data Management</div>
      <SharedStorageBanner setState={setState} setConfigs={setConfigs} setActiveId={setActiveId}/>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="btn bs bsm" onClick={exportAllData}>Export All Data JSON</button>
        <label className="btn bg bsm" style={{cursor:"pointer"}}>Import Data JSON<input type="file" accept="application/json,.json" onChange={importAllData} style={{display:"none"}}/></label>
        <button className="btn bg bsm" onClick={resetVocab}>Reset Vocab Progress</button>
        <button className="btn bg bsm" onClick={()=>{if(window.confirm("Clear all band history?")) setState({...state,bandHistory:[]});}}>Clear Band History</button>
        <button className="btn bg bsm" onClick={()=>{if(window.confirm("Clear priority words queue?")) setState({...state,priorityWords:[]});}}>Clear Priority Queue</button>
      </div>
      <div style={{fontSize:11,color:"var(--ink3)",marginTop:9,lineHeight:1.55}}>
        <strong style={{color:"var(--honey)"}}>⚠ API keys are saved as plaintext</strong> in browser localStorage — any browser extension or XSS exploit could read them.
        For sensitive work, use a dedicated browser profile, prefer free providers (Gemini), and rotate keys periodically. Nothing leaves your browser except direct calls to the AI provider you choose.
      </div>
    </div>
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APP ROOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
