// API LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PRESETS = {
  // — Confirmed working from Vietnam (email/OAuth signup, no phone) —
  gemini:{name:"Gemini",url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",model:"gemini-2.0-flash",format:"gemini",link:"https://aistudio.google.com/apikey"},
  gemini_pro:{name:"Gemini 2.5 Pro",url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",model:"gemini-2.5-pro",format:"gemini",link:"https://aistudio.google.com/apikey"},
  groq:{name:"Groq",url:"https://api.groq.com/openai/v1/chat/completions",model:"llama-3.3-70b-versatile",format:"openai",link:"https://console.groq.com/keys"},
  openrouter:{name:"OpenRouter",url:"https://openrouter.ai/api/v1/chat/completions",model:"meta-llama/llama-3.3-70b-instruct:free",format:"openai",link:"https://openrouter.ai/keys"},
  // — Chinese providers (accept international users) —
  zhipu:{name:"Zhipu GLM",url:"https://open.bigmodel.cn/api/paas/v4/chat/completions",model:"glm-4-flash",format:"openai",link:"https://open.bigmodel.cn/usercenter/apikeys"},
  deepseek:{name:"DeepSeek",url:"https://api.deepseek.com/v1/chat/completions",model:"deepseek-chat",format:"openai",link:"https://platform.deepseek.com/api_keys"},
  kimi:{name:"Kimi (Moonshot)",url:"https://api.moonshot.cn/v1/chat/completions",model:"moonshot-v1-8k",format:"openai",link:"https://platform.moonshot.cn/console/api-keys"},
  // — Likely require US phone / verification (may be blocked from VN) —
  together:{name:"Together AI",url:"https://api.together.xyz/v1/chat/completions",model:"meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",format:"openai",link:"https://api.together.xyz/settings/api-keys"},
  nvidia:{name:"NVIDIA NIM",url:"https://integrate.api.nvidia.com/v1/chat/completions",model:"meta/llama-3.3-70b-instruct",format:"openai",link:"https://build.nvidia.com/explore/discover"},
  hyperbolic:{name:"Hyperbolic",url:"https://api.hyperbolic.xyz/v1/chat/completions",model:"meta-llama/Meta-Llama-3.1-405B-Instruct",format:"openai",link:"https://app.hyperbolic.xyz/settings"},
  cerebras:{name:"Cerebras",url:"https://api.cerebras.ai/v1/chat/completions",model:"llama-3.3-70b",format:"openai",link:"https://cloud.cerebras.ai/platform/"},
  sambanova:{name:"SambaNova",url:"https://api.sambanova.ai/v1/chat/completions",model:"Meta-Llama-3.1-405B-Instruct",format:"openai",link:"https://cloud.sambanova.ai/apis"},
  mistral:{name:"Mistral AI",url:"https://api.mistral.ai/v1/chat/completions",model:"mistral-large-latest",format:"openai",link:"https://console.mistral.ai/api-keys"},
  anthropic:{name:"Anthropic Claude",url:"https://api.anthropic.com/v1/messages",model:"claude-sonnet-4-5",format:"anthropic",link:"https://console.anthropic.com/settings/keys"},
  xai:{name:"xAI Grok",url:"https://api.x.ai/v1/chat/completions",model:"grok-3-mini",format:"openai",link:"https://console.x.ai/"},
  openai:{name:"OpenAI",url:"https://api.openai.com/v1/chat/completions",model:"gpt-4o-mini",format:"openai",link:"https://platform.openai.com/api-keys"},
  custom:{name:"Custom",url:"",model:"",format:"openai",link:""}
};

async function callAPI(config, messages, maxTokens=2000) {
  const {url,model,key,format} = config;
  if (!url||!key) throw new Error("Missing URL or API key");
  let fetchUrl, opts;
  const sysMsg = messages.find(m=>m.role==="system");
  const userMsgs = messages.filter(m=>m.role!=="system");
  // 60s timeout — protects UI from hanging providers (especially free tiers under load)
  const ctrl = new AbortController();
  const timeoutId = setTimeout(()=>ctrl.abort(), 60000);
  if (format==="gemini") {
    // Combine system + user into single text block (Gemini handles single-part content best)
    const combined = (sysMsg ? sysMsg.content+"\n\n" : "") + userMsgs.map(m=>m.content).join("\n\n");
    fetchUrl = `${url}${url.includes("?")?"&":"?"}key=${key}`;
    opts = {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:combined}]}],generationConfig:{temperature:0.7,maxOutputTokens:maxTokens}}),signal:ctrl.signal};
  } else if (format==="anthropic") {
    fetchUrl = url;
    const body = {model,max_tokens:maxTokens,messages:userMsgs};
    if (sysMsg) body.system = sysMsg.content;
    opts = {method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body),signal:ctrl.signal};
  } else {
    fetchUrl = url;
    opts = {method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model,messages,max_tokens:maxTokens,temperature:0.7}),signal:ctrl.signal};
  }
  let res;
  try {
    res = await fetch(fetchUrl, opts);
  } catch(e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') throw new Error('Request timed out after 60s — provider too slow or unreachable. Try again or switch provider.');
    // Network-level error (CORS, DNS, offline)
    throw new Error(`Network error: ${e.message}. If using OpenAI/Anthropic direct, browser CORS may block — try Gemini/Groq/OpenRouter instead.`);
  }
  clearTimeout(timeoutId);
  if (!res.ok) {
    let errText = "";
    try { errText = await res.text(); } catch {}
    const snippet = errText.slice(0,180).replace(/\n/g," ");
    if (res.status===401||res.status===403) throw new Error(`Invalid API key (${res.status}). Check key on provider's dashboard. ${snippet?"· "+snippet:""}`);
    if (res.status===429) {
      let hint = "";
      const isQuotaIssue = /insufficient[_ ]quota|exceeded.*quota|billing|payment|credits?\s*(left|remaining|exhausted)|no credits/i.test(errText);
      if (url.includes("api.openai.com")) hint = isQuotaIssue ? "OpenAI quota exhausted — add billing at platform.openai.com/account/billing OR use Gemini (free)" : "OpenAI rate limit — wait 20s";
      else if (url.includes("openrouter.ai")) hint = "OpenRouter free tier is very limited (50 req/day if no credits). Try Gemini directly OR add $5+ credits to OpenRouter";
      else if (url.includes("groq.com")) hint = "Groq rate limit (30 req/min on free tier) — wait 60s OR switch to Together AI / NVIDIA NIM";
      else if (url.includes("api.cerebras.ai")) hint = "Cerebras rate limit — free tier ~1M tokens/day. Wait or switch to Gemini";
      else if (url.includes("api.sambanova.ai")) hint = "SambaNova rate limit (free tier ~10 rpm) — wait 60s OR try Gemini";
      else if (url.includes("api.together.xyz")) hint = "Together AI: free Llama-3.3-70B-Instruct-Turbo-Free has ~60 rpm limit. Wait or top up $1+";
      else if (url.includes("integrate.api.nvidia.com")) hint = "NVIDIA NIM: free 1000 credits/account. Check usage at build.nvidia.com OR switch to Gemini";
      else if (url.includes("api.hyperbolic.xyz")) hint = isQuotaIssue ? "Hyperbolic free credits exhausted — top up at app.hyperbolic.xyz/billing" : "Hyperbolic rate limit — wait 30s";
      else if (url.includes("api.anthropic.com")) hint = isQuotaIssue ? "Anthropic credit balance low — top up at console.anthropic.com/settings/billing" : "Anthropic burst limit — wait 30s";
      else if (url.includes("api.mistral.ai")) hint = "Mistral rate limit (free experimental tier ~1 rpm) — wait 60s OR add payment";
      else if (url.includes("api.x.ai")) hint = isQuotaIssue ? "xAI credits exhausted — top up at console.x.ai" : "xAI rate limit — wait 30s";
      else if (url.includes("open.bigmodel.cn")) hint = "Zhipu GLM: free model glm-4-flash has rate limits — wait 60s OR switch to Gemini";
      else if (url.includes("api.moonshot.cn")) hint = "Kimi account balance = 0 — nạp tiền tại platform.moonshot.cn/fee. Hoặc dùng Gemini (miễn phí)";
      else if (url.includes("deepseek.com")) hint = "DeepSeek balance issue — check platform.deepseek.com/usage";
      else if (url.includes("generativelanguage.googleapis.com")) hint = "Gemini rate limit (15 req/min on free tier) — wait 60s";
      else hint = isQuotaIssue ? "Quota/billing issue — check provider account" : "Burst rate limit — wait 30s and retry";
      throw new Error(`Rate limited (429) · ${hint} · response: ${snippet}`);
    }
    if (res.status===404) throw new Error(`Model/URL not found (404). Model "${model}" may be deprecated. ${snippet?"· "+snippet:""}`);
    if (res.status===400) throw new Error(`Bad request (400) · ${snippet}`);
    if (res.status>=500) throw new Error(`Provider server error (${res.status}). Try again or switch provider.`);
    throw new Error(`API ${res.status} · ${snippet}`);
  }
  let d;
  try { d = await res.json(); }
  catch(e) { throw new Error(`Invalid JSON response: ${e.message}`); }
  if (format==="gemini") {
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const block = d.promptFeedback?.blockReason || d.candidates?.[0]?.finishReason;
      throw new Error(`Empty Gemini response${block?` (${block})`:""}`);
    }
    return text;
  }
  if (format==="anthropic") return d.content?.[0]?.text||"";
  const content = d.choices?.[0]?.message?.content;
  if (content==null) throw new Error(`No content in response. Body: ${JSON.stringify(d).slice(0,150)}`);
  return content;
}

function extractJSONCandidate(text) {
  const clean = String(text||"")
    .replace(/```(?:json)?/gi,"")
    .replace(/```/g,"")
    .trim();
  const start = clean.search(/[\{\[]/);
  if (start < 0) return clean;
  const open = clean[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i=start;i<clean.length;i++) {
    const c = clean[i];
    if (esc) { esc=false; continue; }
    if (c === "\\") { esc=true; continue; }
    if (c === '"') { inStr=!inStr; continue; }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return clean.slice(start,i+1).trim();
    }
  }
  return clean.slice(start).trim();
}

function repairJSONText(text) {
  return String(text||"")
    .replace(/^\uFEFF/,"")
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/,\s*([}\]])/g,"$1")
    .replace(/([{,]\s*)([A-Za-z_$][\w$-]*)\s*:/g,'$1"$2":')
    .trim();
}

function balanceJSONText(text) {
  let r=String(text||""), braces=0, brackets=0, inStr=false, esc=false;
  for (const c of r) {
    if (esc){esc=false;continue} if (c==='\\'){esc=true;continue}
    if (c==='"'){inStr=!inStr;continue} if (inStr) continue;
    if (c==='{') braces++; else if (c==='}') braces--;
    if (c==='[') brackets++; else if (c===']') brackets--;
  }
  if (inStr) r+='"';
  for (let i=0;i<brackets;i++) r+=']';
  for (let i=0;i<braces;i++) r+='}';
  return r;
}

function safeJSON(text) {
  const candidate = extractJSONCandidate(text);
  const repaired = repairJSONText(candidate);
  const singleQuoteRepaired = repaired.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g,(_,s)=>JSON.stringify(s.replace(/\\'/g,"'")));
  const attempts = [
    String(text||"").trim(),
    candidate,
    repaired,
    balanceJSONText(candidate),
    balanceJSONText(repaired),
    singleQuoteRepaired,
    balanceJSONText(singleQuoteRepaired)
  ].filter(Boolean);
  let lastError = null;
  for (const attempt of attempts) {
    try { return JSON.parse(attempt); }
    catch(e) { lastError = e; }
  }
  throw lastError || new Error("Invalid JSON from AI response");
}


// === Phase 2: Adapter — compact AWL_DATA entry -> WordCard-compatible shape ===
