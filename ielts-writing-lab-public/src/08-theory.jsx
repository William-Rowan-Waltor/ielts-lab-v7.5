function TheoryPage() {
  const [tab,setTab] = useState("line");
  const [innerTab,setInnerTab] = useState(0);
  const sections = [
    {id:"line",label:"Line",grp:"Chart Types"},
    {id:"bar",label:"Bar",grp:"Chart Types"},
    {id:"pie",label:"Pie",grp:"Chart Types"},
    {id:"table",label:"Table",grp:"Chart Types"},
    {id:"process",label:"Process",grp:"Other"},
    {id:"map",label:"Map",grp:"Other"},
    {id:"mixed",label:"Multiple",grp:"Other"},
    {id:"structure",label:"Structure",grp:"Essentials"},
    {id:"rubric",label:"Rubric",grp:"Essentials"}
  ];

  const InnerTabs = ({tabs,active,onChange})=><div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid var(--border)",paddingBottom:0}}>
    {tabs.map((t,i)=><button key={i} onClick={()=>onChange(i)} style={{padding:"7px 14px",background:"transparent",border:"none",borderBottom:`2px solid ${active===i?"var(--leaf)":"transparent"}`,color:active===i?"var(--leaf)":"var(--ink3)",fontSize:12.5,fontWeight:active===i?500:400,cursor:"pointer",marginBottom:-1,transition:"all .13s"}}>{t}</button>)}
  </div>;

  return <div className="canvas fu">
    <div className="kicker">Study Guide · Theory</div>
    <h1 className="title-x">Task 1 <em>Guide</em></h1>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
      {["Chart Types","Other","Essentials"].map(grp=><div key={grp} style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9,letterSpacing:".12em",textTransform:"uppercase",color:"var(--ink3)",marginRight:6,minWidth:80}}>{grp}</span>
        {sections.filter(s=>s.grp===grp).map(s=><button key={s.id} className={`btn ${tab===s.id?"bp":"bg"} bsm`} onClick={()=>{setTab(s.id);setInnerTab(0);}}>{s.label}</button>)}
      </div>)}
    </div>

    {tab==="line"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Một line chart kể một <strong>câu chuyện</strong>: cái gì cao, cái gì thấp, ai vượt ai. Nhiệm vụ không phải đọc từng điểm dữ liệu — mà kể câu chuyện đó bằng tiếng Anh học thuật.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Model Answer","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, it is clear that <span className="slot">[main trend]</span>,{"\n"}while <span className="slot">[contrasting point]</span>.</div>
          <div className="why">NO numbers in overview. States biggest trend + 1 contrast. Missing this = Band ≤6.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Trend Sentence</div>
          <div className="pattern"><span className="slot">[Subject]</span> <span className="slot">[verb]</span> <span className="slot">[adverb]</span>{"\n"}from <span className="slot">[X]</span> to <span className="slot">[Y]</span>{"\n"}between <span className="slot">[year1]</span> and <span className="slot">[year2]</span>.</div>
          <div className="why">4-slot formula. Vary verb + adverb — never repeat "increased significantly" 5×.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Peak / Trough</div>
          <div className="pattern"><span className="slot">[Subject]</span> reached a peak of <span className="slot">[value]</span>{"\n"}in <span className="slot">[year]</span>, before <span className="slot">[verb-ing]</span> to <span className="slot">[value]</span>.</div>
          <div className="why">Use when curve has a clear turning point. Examiners want to see you notice it.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Crossover</div>
          <div className="pattern">While <span className="slot">[A]</span> initially led, the two figures{"\n"}crossed around <span className="slot">[year]</span>. By <span className="slot">[year2]</span>,{"\n"}<span className="slot">[B]</span> had surpassed <span className="slot">[A]</span>.</div>
          <div className="why">Crossover = score opportunity. Past perfect "had surpassed" boosts GRA.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Trend Verbs</div>
          <div className="chip-tier">Strong rise</div><div className="chips"><span className="chip cs">surge</span><span className="chip cs">soar</span><span className="chip cs">rocket</span><span className="chip cs">leap</span></div>
          <div className="chip-tier">Gradual rise</div><div className="chips"><span className="chip">climb</span><span className="chip">rise steadily</span><span className="chip">edge up</span><span className="chip">grow gradually</span></div>
          <div className="chip-tier">Strong fall</div><div className="chips"><span className="chip cr">plummet</span><span className="chip cr">plunge</span><span className="chip cr">tumble</span><span className="chip cr">crash</span></div>
          <div className="chip-tier">Gradual fall</div><div className="chips"><span className="chip">dip</span><span className="chip cl">decline</span><span className="chip">drop slightly</span><span className="chip">slip</span></div>
          <div className="chip-tier">Stable</div><div className="chips"><span className="chip ch">level off</span><span className="chip ch">plateau</span><span className="chip ch">stabilise</span><span className="chip cl">fluctuate</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Adverbs + Approximation</div>
          <div className="chip-tier">Strong</div><div className="chips"><span className="chip cr">dramatically</span><span className="chip cr">sharply</span><span className="chip cl">significantly</span><span className="chip">considerably</span></div>
          <div className="chip-tier">Moderate</div><div className="chips"><span className="chip">steadily</span><span className="chip">gradually</span><span className="chip">noticeably</span></div>
          <div className="chip-tier">Weak</div><div className="chips"><span className="chip">slightly</span><span className="chip">marginally</span><span className="chip">moderately</span></div>
          <div className="chip-tier">Approximation</div><div className="chips"><span className="chip co">approximately</span><span className="chip co">roughly</span><span className="chip">around</span><span className="chip">just over</span><span className="chip">nearly</span></div>
          <div className="why" style={{marginTop:10}}>Can't remember exact number? Use approximation. Examiner grades HOW you express, not exactness.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="card">
        <div className="card-h"><div className="cdot"/>Band 7 Model Answer · 184 words</div>
        <div className="model-ans">
          <p>The line graph illustrates the <span className="hl">percentage of households</span> in four countries that owned a computer between 1995 and 2015.</p>
          <p><span className="b7">Overall</span>, it is clear that computer ownership <span className="b7">rose considerably</span> in all four nations over the period, with Country A consistently recording the highest figures throughout.</p>
          <p>In 1995, Country A had the greatest proportion of computer-owning households at 20%, and this figure <span className="hl">surged steadily</span> to reach 80% by 2015. Country B followed a similar upward trend, <span className="hl">climbing from</span> 15% to approximately 68% over the same period. <span className="nb">Notably</span>, Countries B and C <span className="hl">crossed paths</span> around 2005, after which C maintained a slightly higher rate.</p>
          <p>Country D <span className="hl">started at the lowest point</span> of just 5% in 1995; however, it experienced the most <span className="hl">dramatic relative growth</span>, eventually reaching 55% by 2015 — an <span className="hl">elevenfold increase</span> over two decades.</p>
          <div className="annotation"><strong style={{color:"var(--orchid)"}}>Why Band 7:</strong> Overview clear (no numbers) ▸ 4 different trend verbs ▸ Crossover noted with exact year ▸ Uncommon: "elevenfold increase" ▸ Complex: "after which C maintained" (relative clause).</div>
        </div>
      </div>}
      {innerTab===3&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Overview in paragraph 2 (no numbers)","Highlight ≥2 key features","Cite specific data in body","Select carefully, don't describe everything"]},
          {c:"var(--sky)",h:"✓ Coherence & Cohesion",items:["4 clear paragraphs: intro/overview/body1/body2","Varied linking words","Avoid starting 3 sentences with 'The'","Never repeat 'however, however'"]},
          {c:"var(--rose)",h:"✓ Lexical Resource",items:["≥3 different trend verbs","Paraphrase the task question","Less common vocab (elevenfold, hover)","No verb repetition within one paragraph"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Mix simple + complex sentences","Passive when needed (was recorded)","Simple past for completed data","Relative clauses (which, after which)"]},
          {c:"var(--honey)",h:"⚠ Common Mistakes",items:["Missing overview → Band ≤6","Copying the question verbatim","Using 'increase' throughout","Ignoring crossover points"]},
          {c:"var(--ink3)",h:"📏 Word Count",items:["Minimum: 150 words","Optimal: 165–185 words","Avoid: >220 words","20 minutes / 20% of Writing"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="bar"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Bar chart = <strong>comparison</strong>. The x-axis is usually categories, not time. Your job: find the highest, the lowest, and the most interesting gap or reversal.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Pattern</div>
          <div className="pattern"><span className="slot">[A]</span> had the highest <span className="slot">[measure]</span>{"\n"}at <span className="slot">[X]</span>, followed by <span className="slot">[B]</span> at <span className="slot">[Y]</span>.</div>
          <div className="why">Ranking with specific values. Don't just say "A was more than B".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Contrast Pattern</div>
          <div className="pattern">While <span className="slot">[A]</span> recorded <span className="slot">[high value]</span>,{"\n"}<span className="slot">[B]</span> showed a much lower figure{"\n"}of only <span className="slot">[low value]</span>.</div>
          <div className="why">"While" signals contrast elegantly. More sophisticated than "but".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Grouped Bar Pattern</div>
          <div className="pattern">In <span className="slot">[category 1]</span>, <span className="slot">[A]</span> was{"\n"}considerably higher than <span className="slot">[B]</span>;{"\n"}however, this pattern reversed in <span className="slot">[category 2]</span>.</div>
          <div className="why">Reversals are scoring opportunities. Examiners want you to notice inversions.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview for Bar Chart</div>
          <div className="pattern">Overall, <span className="slot">[A]</span> consistently dominated{"\n"}across most categories, while <span className="slot">[B]</span>{"\n"}recorded the lowest figures throughout.</div>
          <div className="why">Same rule: overview has no specific numbers. States dominant feature + contrast.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Phrases</div>
          <div className="chips"><span className="chip cs">significantly higher than</span><span className="chip cs">considerably more than</span><span className="chip">approximately double</span><span className="chip">roughly twice as much</span><span className="chip cl">in contrast</span><span className="chip cl">by contrast</span></div>
          <div className="chip-tier">Proportion language</div>
          <div className="chips"><span className="chip co">proportion</span><span className="chip co">percentage</span><span className="chip">share</span><span className="chip">fraction</span><span className="chip">majority</span><span className="chip">minority</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Ranking Language</div>
          <div className="chips"><span className="chip cr">the highest figure</span><span className="chip cr">the lowest rate</span><span className="chip ch">the second highest</span><span className="chip">at the top</span><span className="chip">at the bottom</span></div>
          <div className="chip-tier">Exception signals</div>
          <div className="chips"><span className="chip">the only exception</span><span className="chip">notably</span><span className="chip">in contrast</span><span className="chip">despite this</span></div>
          <div className="why" style={{marginTop:8}}>Exceptions = key features. Always note the outlier in your body paragraph.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-2">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Overview: identify dominant category","Note at least 1 interesting comparison","Include data from ≥2 categories in body","Don't describe every single bar"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Comparatives: higher than, as high as","Superlatives: the highest, the most","Past simple for past data","Present simple if no time given"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="pie"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Pie chart = <strong>proportions of a whole</strong>. Tổng luôn = 100%. Tìm slice <strong>lớn nhất</strong>, <strong>nhỏ nhất</strong>, và 1 cặp đáng so sánh. <strong>Không bao giờ</strong> mô tả từng slice một.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Proportion Pattern</div>
          <div className="pattern"><span className="slot">[Category]</span> made up{"\n"}<span className="slot">[X%]</span> of the total,{"\n"}representing the largest share.</div>
          <div className="why">3 verbs phải xoay vòng: "made up" / "accounted for" / "represented".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Comparison Pattern</div>
          <div className="pattern">In contrast, <span className="slot">[Category B]</span>{"\n"}constituted only <span className="slot">[Y%]</span>,{"\n"}roughly <span className="slot">[half/double]</span> the figure for <span className="slot">[A]</span>.</div>
          <div className="why">Multiplicative comparison ("roughly double") ăn điểm LR cao hơn "more than".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Two-Pie Comparison</div>
          <div className="pattern">While <span className="slot">[A]</span> dominated in <span className="slot">[year1]</span>{"\n"}at <span className="slot">[X%]</span>, by <span className="slot">[year2]</span> its share had{"\n"}<span className="slot">[fallen/risen]</span> to <span className="slot">[Y%]</span>.</div>
          <div className="why">Past perfect "had fallen" → boost GRA. Dùng khi 2 pie ở 2 thời điểm khác nhau.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, <span className="slot">[A]</span> was the predominant{"\n"}<span className="slot">[category]</span>, while <span className="slot">[B]</span> made up{"\n"}the smallest proportion.</div>
          <div className="why">Overview KHÔNG số. Chỉ dominant + smallest. Đó là 2 key features bắt buộc.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Proportion Verbs</div>
          <div className="chip-tier">Showing percentage</div>
          <div className="chips"><span className="chip cl">make up</span><span className="chip cl">account for</span><span className="chip cl">represent</span><span className="chip">constitute</span><span className="chip">comprise</span></div>
          <div className="chip-tier">Size language</div>
          <div className="chips"><span className="chip cs">the largest share</span><span className="chip cs">the dominant proportion</span><span className="chip">the smallest portion</span><span className="chip">a minor fraction</span></div>
          <div className="chip-tier">Categorisation</div>
          <div className="chips"><span className="chip co">majority</span><span className="chip co">minority</span><span className="chip">half</span><span className="chip">a third</span><span className="chip">two-fifths</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Approximation Phrases</div>
          <div className="chip-tier">Near round numbers</div>
          <div className="chips"><span className="chip">just over</span><span className="chip">just under</span><span className="chip">close to</span><span className="chip">approximately</span><span className="chip">roughly</span><span className="chip">around</span></div>
          <div className="chip-tier">Comparative scale</div>
          <div className="chips"><span className="chip ch">twice as much as</span><span className="chip ch">half of</span><span className="chip">three times the figure for</span><span className="chip">a quarter of</span></div>
          <div className="why" style={{marginTop:8}}>Pie thường có số tròn (15%, 30%). Vẫn dùng "approximately 15%" để tự nhiên hơn.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Pie Specifics",items:["Verify total = 100% (or near)","Identify largest + smallest","Group small slices if many","Note any 'Other' category"]},
          {c:"var(--rose)",h:"✓ Lexical Resource",items:["≥3 proportion verbs (make up / account for / represent)","Use 'majority/minority' once","Avoid repeating 'percent' — vary with 'share/proportion'","Approximation chữ thay vì số liên tục"]},
          {c:"var(--honey)",h:"⚠ Common Mistakes",items:["Listing all slices in order","Forgetting overview","Using 'increase' for pie chart (không có time!)","Saying 'percent' 7 lần"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="table"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Table là <strong>data-dense nhất</strong>. Quy tắc số 1: <strong>không mô tả tất cả</strong>. Chọn 3-4 features đáng kể (highest, lowest, biggest change, exception) và dùng để xây overview + body.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Ranking Pattern</div>
          <div className="pattern">Among the <span className="slot">[N categories]</span>,{"\n"}<span className="slot">[A]</span> recorded the highest figure{"\n"}at <span className="slot">[X]</span>, followed by <span className="slot">[B]</span> at <span className="slot">[Y]</span>.</div>
          <div className="why">Bắt đầu với "Among" — examiner thấy bạn đang chọn lọc, không mô tả hết.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Range Pattern</div>
          <div className="pattern">Figures ranged from <span className="slot">[low]</span>{"\n"}in <span className="slot">[category]</span> to as high as{"\n"}<span className="slot">[high]</span> in <span className="slot">[category]</span>.</div>
          <div className="why">"Ranged from X to Y" gói gọn nhiều data points trong 1 câu — sang & hiệu quả.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Change Pattern (over time)</div>
          <div className="pattern">The most striking change occurred in{"\n"}<span className="slot">[category]</span>, where the figure{"\n"}<span className="slot">[verb]</span> from <span className="slot">[X]</span> to <span className="slot">[Y]</span>.</div>
          <div className="why">"The most striking change" = key feature. Dùng khi table có ≥2 thời điểm.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Exception Pattern</div>
          <div className="pattern">The only exception to this trend was{"\n"}<span className="slot">[category]</span>, which <span className="slot">[verb]</span>{"\n"}while others <span className="slot">[verb]</span>.</div>
          <div className="why">Examiner LOVES exceptions. Một table có outlier = cơ hội ăn điểm Task Achievement.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Selection Language</div>
          <div className="chip-tier">Highlighting key data</div>
          <div className="chips"><span className="chip cl">most notably</span><span className="chip cl">most strikingly</span><span className="chip cs">remarkably</span><span className="chip">in particular</span><span className="chip">interestingly</span></div>
          <div className="chip-tier">Range expressions</div>
          <div className="chips"><span className="chip co">ranged from X to Y</span><span className="chip co">varied between</span><span className="chip">spanned</span><span className="chip">extended from</span></div>
          <div className="chip-tier">Picking out</div>
          <div className="chips"><span className="chip">among these</span><span className="chip">of all categories</span><span className="chip">the only exception</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Comparison</div>
          <div className="chip-tier">Pattern matching</div>
          <div className="chips"><span className="chip cs">similarly</span><span className="chip cs">likewise</span><span className="chip">in the same vein</span><span className="chip">following a comparable pattern</span></div>
          <div className="chip-tier">Contrast</div>
          <div className="chips"><span className="chip cr">in contrast</span><span className="chip cr">conversely</span><span className="chip">on the other hand</span><span className="chip">whereas</span></div>
          <div className="why" style={{marginTop:8}}>Table có ≥2 chiều (row × column) → CC band cần linking words đa dạng.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Selection Strategy",items:["Chọn 3-4 features (KHÔNG nhiều hơn)","Always identify highest + lowest","Look for biggest gap or change","Find any exception/outlier"]},
          {c:"var(--sky)",h:"✓ Structure",items:["Para 1: paraphrase task","Para 2: overview (2 main features, no numbers)","Para 3: top 2 features + data","Para 4: contrasting/exception + data"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Describing every cell","Random number listing","Reading table top-to-bottom","Forgetting units (%, $, kg)"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="process"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Process diagram = <strong>không có số, không so sánh</strong>. Chỉ có <strong>chuỗi các bước</strong>. Yêu cầu: passive voice + sequential connectors + accurate vocabulary cho từng giai đoạn.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Opening Pattern</div>
          <div className="pattern">The diagram illustrates how{"\n"}<span className="slot">[product]</span> is produced{"\n"}in <span className="slot">[N]</span> distinct stages.</div>
          <div className="why">Đếm số stage và state ngay đầu — examiner thấy bạn đã grasp toàn bộ process.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, the process begins with{"\n"}<span className="slot">[input]</span> and ends with{"\n"}<span className="slot">[output]</span>, involving <span className="slot">[key actions]</span>.</div>
          <div className="why">Overview cho process = input → output + 1 key transformation. Không có "main trend".</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Sequential Pattern</div>
          <div className="pattern">In the first stage, <span className="slot">[X]</span> is{"\n"}<span className="slot">[verb-passive]</span>. Subsequently, the{"\n"}<span className="slot">[material]</span> is then <span className="slot">[verb-passive]</span>.</div>
          <div className="why">Passive voice dominant. Active voice OK cho natural processes (the river flows).</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cyclic Pattern</div>
          <div className="pattern">The final stage produces <span className="slot">[output]</span>,{"\n"}which is then returned to <span className="slot">[start]</span>,{"\n"}completing the cycle.</div>
          <div className="why">Nếu cyclic, KHÔNG QUÊN nhắc "completing the cycle" — đó là feature key.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Sequence Connectors</div>
          <div className="chip-tier">Beginning</div>
          <div className="chips"><span className="chip cl">initially</span><span className="chip cl">in the first stage</span><span className="chip">to begin with</span><span className="chip">at the outset</span></div>
          <div className="chip-tier">Middle</div>
          <div className="chips"><span className="chip cs">subsequently</span><span className="chip cs">next</span><span className="chip">then</span><span className="chip">after this</span><span className="chip">following this</span><span className="chip">at this point</span></div>
          <div className="chip-tier">End</div>
          <div className="chips"><span className="chip co">finally</span><span className="chip co">in the final stage</span><span className="chip">ultimately</span><span className="chip">lastly</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Process Verbs (Passive)</div>
          <div className="chip-tier">Industrial</div>
          <div className="chips"><span className="chip cr">is heated</span><span className="chip cr">is filtered</span><span className="chip">is mixed with</span><span className="chip">is separated</span><span className="chip">is collected</span><span className="chip">is cooled</span></div>
          <div className="chip-tier">Transformation</div>
          <div className="chips"><span className="chip ch">is converted into</span><span className="chip ch">is transformed</span><span className="chip">is broken down</span><span className="chip">is produced</span><span className="chip">is formed</span></div>
          <div className="why" style={{marginTop:8}}>Tense rule: present simple passive cho timeless processes. Past simple passive nếu nói về historical process.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["State number of stages clearly","Cover ALL stages (don't skip)","Identify if linear or cyclic","Note any branching/parallel paths"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Passive voice dominant","Present simple for ongoing processes","'which' relative clauses for adding info","No subject jumping (keep -ing consistent)"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Active voice everywhere","Personal pronouns (you, we, they)","Numbers/percentages (none in process!)","Comparing efficiency"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="map"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Map = <strong>before/after</strong> tại một địa điểm (thường 2 hoặc 3 thời điểm). Cần: <strong>past simple passive</strong> + <strong>compass directions</strong> + <strong>position language</strong>. Đừng kể từng building — chọn ra 3-4 thay đổi đáng kể.
      </div>
      <InnerTabs tabs={["Patterns","Vocabulary","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Change Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> in the <span className="slot">[direction]</span>{"\n"}was demolished and replaced by{"\n"}a new <span className="slot">[feature]</span>.</div>
          <div className="why">"Was demolished and replaced" = chuỗi 2 verbs passive — sang & ăn điểm GRA.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Addition Pattern</div>
          <div className="pattern">A <span className="slot">[new feature]</span> was constructed{"\n"}to the <span className="slot">[direction]</span> of the{"\n"}<span className="slot">[existing landmark]</span>.</div>
          <div className="why">"To the north of X" — relative direction. Tốt hơn "in the north" chung chung.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Removal Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> that once stood{"\n"}in the <span className="slot">[location]</span> had been{"\n"}removed by <span className="slot">[year]</span>.</div>
          <div className="why">"Had been removed" = past perfect passive. Boost GRA mạnh.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Preservation Pattern</div>
          <div className="pattern">The <span className="slot">[feature]</span> in the centre{"\n"}remained unchanged throughout{"\n"}the period.</div>
          <div className="why">Examiner muốn thấy bạn note CẢ những thứ KHÔNG thay đổi.</div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Directions & Position</div>
          <div className="chip-tier">Compass</div>
          <div className="chips"><span className="chip cs">in the north</span><span className="chip cs">to the south of</span><span className="chip">in the eastern part</span><span className="chip">towards the west</span><span className="chip">in the northeast corner</span></div>
          <div className="chip-tier">Relative position</div>
          <div className="chips"><span className="chip co">adjacent to</span><span className="chip co">alongside</span><span className="chip">opposite</span><span className="chip">next to</span><span className="chip">surrounded by</span><span className="chip">between X and Y</span></div>
          <div className="chip-tier">Centre/edge</div>
          <div className="chips"><span className="chip">in the centre</span><span className="chip">on the outskirts</span><span className="chip">at the edge of</span></div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Change Verbs (Passive)</div>
          <div className="chip-tier">Build / add</div>
          <div className="chips"><span className="chip cl">was constructed</span><span className="chip cl">was built</span><span className="chip">was erected</span><span className="chip">was established</span></div>
          <div className="chip-tier">Remove / change</div>
          <div className="chips"><span className="chip cr">was demolished</span><span className="chip cr">was replaced by</span><span className="chip cr">was converted into</span><span className="chip">was redeveloped</span></div>
          <div className="chip-tier">Expand / preserve</div>
          <div className="chips"><span className="chip ch">was expanded</span><span className="chip ch">was extended</span><span className="chip">remained unchanged</span><span className="chip">was preserved</span></div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Identify 3-4 main changes","Note what stayed the same","Use compass directions","Mention scale if shown"]},
          {c:"var(--orchid)",h:"✓ Grammar",items:["Past simple passive (was built)","Past perfect for sequenced changes","Relative clauses (which was once)","Comparatives with map context"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Listing every single building","Vague directions ('over there')","Forgetting the unchanged parts","Wrong tense (uses present)"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="mixed"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">Intuition</div>
        Multiple/Mixed charts = 2 visuals (line + pie, hoặc 2 bar, etc.). <strong>Quy tắc số 1</strong>: group features <strong>theo theme</strong>, không phải theo chart. Cross-reference data giữa 2 chart để show synthesis.
      </div>
      <InnerTabs tabs={["Strategy","Patterns","Checklist"]} active={innerTab} onChange={setInnerTab}/>
      {innerTab===0&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Structure Strategy</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.65,fontWeight:300}}>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 1 (Intro):</strong> Paraphrase BOTH charts in 1 sentence each.</p>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 2 (Overview):</strong> 1 key feature from chart A + 1 key feature from chart B (no numbers).</p>
            <p style={{marginBottom:8}}><strong style={{color:"var(--leaf)"}}>Para 3 (Body 1):</strong> Detail chart A with specific data.</p>
            <p><strong style={{color:"var(--leaf)"}}>Para 4 (Body 2):</strong> Detail chart B + 1 cross-reference if possible.</p>
          </div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Reference</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.65,fontWeight:300}}>
            <p style={{marginBottom:8}}>The killer feature for Band 7+. Example: nếu line chart show population growth và pie show city distribution → connect:</p>
            <p style={{padding:"8px 11px",background:"var(--surface2)",borderRadius:7,fontStyle:"italic",color:"var(--ink2)",borderLeft:"2px solid var(--leaf)"}}>"This population surge coincided with X representing 45% of urban density — likely a contributing factor."</p>
            <p style={{marginTop:8,color:"var(--ink3)"}}>Use words: coincided with, corresponded to, alongside, in parallel with.</p>
          </div>
        </div>
      </div>}
      {innerTab===1&&<div className="cols-2">
        <div className="card"><div className="card-h"><div className="cdot"/>Intro Pattern</div>
          <div className="pattern">The <span className="slot">[chart A type]</span> illustrates{"\n"}<span className="slot">[topic A]</span>, while the{"\n"}<span className="slot">[chart B type]</span> shows{"\n"}<span className="slot">[topic B]</span>.</div>
          <div className="why">"While" connects 2 chart references trong 1 câu — efficient + sang.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Overview Pattern</div>
          <div className="pattern">Overall, <span className="slot">[feature A]</span> shows{"\n"}<span className="slot">[trend]</span>, whereas <span className="slot">[feature B]</span>{"\n"}reveals <span className="slot">[contrasting pattern]</span>.</div>
          <div className="why">1 key feature mỗi chart, không trùng nhau. "Whereas" tạo nice contrast.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Cross-Reference Pattern</div>
          <div className="pattern">Notably, <span className="slot">[chart A datapoint]</span> coincided{"\n"}with <span className="slot">[chart B datapoint]</span>, suggesting{"\n"}a possible relationship.</div>
          <div className="why">Cross-reference giữa 2 chart = signature feature của Band 7+. KHÔNG bỏ qua.</div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Transition Pattern</div>
          <div className="pattern">Turning to the <span className="slot">[chart B]</span>,{"\n"}a different picture emerges:{"\n"}<span className="slot">[main point]</span>.</div>
          <div className="why">Transition giữa 2 body paragraphs. "Turning to" / "Moving to" — natural cohesion.</div>
        </div>
      </div>}
      {innerTab===2&&<div className="cols-3">
        {[
          {c:"var(--leaf)",h:"✓ Task Achievement",items:["Cover BOTH charts","≥1 feature from each in overview","Make at least 1 cross-reference","Don't ignore the smaller chart"]},
          {c:"var(--sky)",h:"✓ Coherence",items:["Clear paragraph for each chart","Smooth transition ('Turning to')","Linking ideas across charts","No abrupt jumps"]},
          {c:"var(--honey)",h:"⚠ Avoid",items:["Describing chart A fully, then B","Forgetting one chart in overview","No cross-reference attempt","Treating it as 2 separate tasks"]}
        ].map((cl,i)=><div key={i} className="checklist">
          <div className="checklist-h" style={{color:cl.c}}>{cl.h}</div>
          <ul>{cl.items.map((item,j)=><li key={j}>{item}</li>)}</ul>
        </div>)}
      </div>}
    </div>}

    {tab==="structure"&&<div className="fu">
      <div className="intuition">
        <div className="int-tag">4-Paragraph Formula</div>
        Band 7+ essays follow a clear 4-paragraph structure. The <strong>Overview is the most important paragraph</strong> — it determines your Task Achievement band.
      </div>
      {[
        {n:"1",name:"Introduction",desc:"Paraphrase the task question. Do NOT copy verbatim. ~25 words.",wc:"~25 words"},
        {n:"2",name:"Overview ★ Most Important",desc:"State 2 main trends/features WITHOUT specific data. Start with 'Overall, ...' Missing this = Band ≤6.",wc:"~35 words"},
        {n:"3",name:"Body Paragraph 1",desc:"Main trend / highest category with specific data points. 2–3 sentences, ≥2 data points.",wc:"~60 words"},
        {n:"4",name:"Body Paragraph 2",desc:"Contrasting trend / second feature + exception if any. Compare with body 1.",wc:"~60 words"}
      ].map(s=><div key={s.n} className="struct-row">
        <div className="snum">{s.n}</div>
        <div style={{flex:1}}><div className="sname">{s.name}</div><div className="sdesc">{s.desc}</div></div>
        <div className="swc">{s.wc}</div>
      </div>)}
      <div className="alert ai mt14">Total: ~180 words. Sweet spot — enough to cover key features without eating into Task 2 time.</div>
      <div className="cols-2 mt14">
        <div className="card"><div className="card-h"><div className="cdot"/>Time Allocation</div>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:12,lineHeight:2,color:"var(--ink2)"}}>
            <div>00:00 → 02:00 &nbsp;<span style={{color:"var(--ink3)"}}>Read, identify features</span></div>
            <div>02:00 → 04:00 &nbsp;<span style={{color:"var(--ink3)"}}>Plan (select 4 features)</span></div>
            <div>04:00 → 17:00 &nbsp;<span style={{color:"var(--leaf)"}}>Write</span></div>
            <div>17:00 → 20:00 &nbsp;<span style={{color:"var(--ink3)"}}>Check tense + spelling</span></div>
          </div>
        </div>
        <div className="card"><div className="card-h"><div className="cdot"/>Paraphrase Rules</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.7,fontWeight:300}}>
            <p><strong style={{color:"var(--ink)"}}>"shows"</strong> → illustrates, depicts, presents</p>
            <p><strong style={{color:"var(--ink)"}}>"the number of"</strong> → the figures for, the quantity of</p>
            <p><strong style={{color:"var(--ink)"}}>"between 1990 and 2020"</strong> → over a 30-year period</p>
            <p><strong style={{color:"var(--ink)"}}>"in four countries"</strong> → across four nations</p>
          </div>
        </div>
      </div>
    </div>}

    {tab==="rubric"&&<div className="fu">
      <div className="alert ai">Each criterion = 25% of score. Overall = average of 4, rounded to nearest 0.5.</div>
      <div className="cols-2">
        {[
          {h:"Task Achievement (25%)",c:"var(--leaf)",items:[
            {b:"Band 8",d:"Covers all requirements; highlights key features clearly."},
            {b:"Band 7",d:"Clear overview of main trends; key features highlighted but could be extended."},
            {b:"Band 6",d:"Overview with info appropriately selected; details may be irrelevant.",col:"var(--honey)"},
            {b:"Band 5",d:"Recounts detail mechanically with no clear overview.",col:"var(--rose)"}
          ]},
          {h:"Coherence & Cohesion (25%)",c:"var(--sky)",items:[
            {b:"Band 8",d:"Sequences information logically; manages all aspects of cohesion well."},
            {b:"Band 7",d:"Logical with clear progression; cohesive devices used appropriately."},
            {b:"Band 6",d:"Information arranged coherently; cohesion may be faulty/mechanical.",col:"var(--honey)"},
            {b:"Band 5",d:"Lacks overall progression; inadequate or over-use of cohesive devices.",col:"var(--rose)"}
          ]},
          {h:"Lexical Resource (25%)",c:"var(--orchid)",items:[
            {b:"Band 8",d:"Wide range, fluent and flexible; skilfully uses uncommon items."},
            {b:"Band 7",d:"Sufficient range for flexibility; less common items with style awareness."},
            {b:"Band 6",d:"Adequate range; attempts less common vocab with some inaccuracy.",col:"var(--honey)"},
            {b:"Band 5",d:"Limited range, minimally adequate; noticeable errors in spelling.",col:"var(--rose)"}
          ]},
          {h:"Grammatical Range & Accuracy (25%)",c:"var(--rose)",items:[
            {b:"Band 8",d:"Wide range of structures; majority of sentences error-free."},
            {b:"Band 7",d:"Variety of complex structures; frequent error-free sentences; few errors."},
            {b:"Band 6",d:"Mix of simple and complex; some errors rarely reduce communication.",col:"var(--honey)"},
            {b:"Band 5",d:"Limited range; complex sentences less accurate than simple.",col:"var(--rose)"}
          ]}
        ].map((cr,i)=><div key={i} className="card">
          <div className="card-h"><div className="cdot" style={{background:cr.c}}/>{cr.h}</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {cr.items.map((it,j)=><div key={j} style={{fontSize:12,lineHeight:1.6,color:"var(--ink2)",fontWeight:300}}>
              <span style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:it.col||cr.c,fontWeight:500}}>{it.b}</span> — {it.d}
            </div>)}
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGE: PRACTICE (Generate + Write + Grade + Bridge)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
