const READING_SOURCE_POLICY = "AI-generated original IELTS-style practice. Not official IELTS, Cambridge, British Council, IDP, IELTS Online Tests, Mini IELTS, or paid textbook material.";

const READING_TOPICS = [
  "science and technology",
  "environment and climate",
  "history and archaeology",
  "education and learning",
  "urban development",
  "health and psychology",
  "business and work",
  "culture and society"
];

const READING_TYPES = [
  {id:"mixed",label:"Mixed set"},
  {id:"true_false_not_given",label:"True / False / Not Given"},
  {id:"yes_no_not_given",label:"Yes / No / Not Given"},
  {id:"matching_information",label:"Matching information"},
  {id:"matching_headings",label:"Matching headings"},
  {id:"matching_features",label:"Matching features"},
  {id:"matching_sentence_endings",label:"Matching sentence endings"},
  {id:"multiple_choice",label:"Multiple choice"},
  {id:"multiple_choice_multiple",label:"Multiple choice - multiple answers"},
  {id:"sentence_completion",label:"Sentence completion"},
  {id:"summary_completion",label:"Summary completion"},
  {id:"note_completion",label:"Note completion"},
  {id:"table_completion",label:"Table completion"},
  {id:"flow_chart_completion",label:"Flow-chart completion"},
  {id:"diagram_label_completion",label:"Diagram label completion"},
  {id:"short_answer",label:"Short answer"}
];

const READING_COMPLETION_TYPES = [
  "sentence_completion",
  "summary_completion",
  "note_completion",
  "table_completion",
  "flow_chart_completion",
  "diagram_label_completion",
  "short_answer"
];

const READING_SELECT_TYPES = [
  "true_false_not_given",
  "yes_no_not_given",
  "matching_information",
  "matching_headings",
  "matching_features",
  "matching_sentence_endings",
  "multiple_choice"
];

const READING_MODE_META = {
  mini:{label:"Mini drill",questions:8,duration:900,passages:1},
  section:{label:"Single section",questions:13,duration:1200,passages:1},
  full:{label:"Full test",questions:40,duration:3600,passages:3}
};

function readingTypeLabel(id) {
  return (READING_TYPES.find(t=>t.id===id)?.label || id || "Reading");
}

function normalizeReadingAnswer(value) {
  return String(value||"")
    .toLowerCase()
    .replace(/[.,;:!?()[\]"']/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function readingChoiceValue(option) {
  const text = String(option||"").trim();
  const m = text.match(/^([A-Z]|[ivxlcdm]+)\s*[\.\)]\s+/i);
  if (!m) return text;
  const token = m[1];
  return /^[ivxlcdm]+$/i.test(token) && token.length > 1 ? token.toLowerCase() : token.toUpperCase();
}

function splitReadingAnswerList(value) {
  if (Array.isArray(value)) return value.map(x=>String(x).trim()).filter(Boolean);
  return String(value||"").split(/[,;/\s]+/).map(x=>x.trim()).filter(Boolean);
}

function countReadingAnswerWords(value) {
  const clean = String(value||"").trim().replace(/\s+/g," ");
  return clean ? clean.split(" ").length : 0;
}

function readingWordLimit(question) {
  if (Number(question.wordLimit) > 0) return Number(question.wordLimit);
  const text = `${question.instruction||""} ${question.prompt||""}`.toUpperCase();
  if (text.includes("NO MORE THAN ONE WORD")) return 1;
  if (text.includes("NO MORE THAN TWO WORDS")) return 2;
  if (text.includes("NO MORE THAN THREE WORDS")) return 3;
  return null;
}

function isReadingAnswerCorrect(question, answer) {
  if (question.type === "multiple_choice_multiple") {
    const expected = splitReadingAnswerList(question.answer).map(x=>normalizeReadingAnswer(x)).sort();
    const given = splitReadingAnswerList(answer).map(x=>normalizeReadingAnswer(x)).sort();
    return expected.length > 0 && expected.length === given.length && expected.every((x,i)=>x===given[i]);
  }
  const limit = READING_COMPLETION_TYPES.includes(question.type) ? readingWordLimit(question) : null;
  if (limit && countReadingAnswerWords(answer) > limit) return false;
  const expected = Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length
    ? [question.answer, ...question.acceptedAnswers]
    : [question.answer];
  const given = normalizeReadingAnswer(answer);
  if (!given) return false;
  return expected.some(x=>normalizeReadingAnswer(x)===given);
}

function readingEstimatedBand(score,total) {
  if (!total) return 0;
  const raw40 = total === 40 ? score : Math.round((score / total) * 40);
  if (raw40 >= 39) return 9.0;
  if (raw40 >= 37) return 8.5;
  if (raw40 >= 35) return 8.0;
  if (raw40 >= 33) return 7.5;
  if (raw40 >= 30) return 7.0;
  if (raw40 >= 27) return 6.5;
  if (raw40 >= 23) return 6.0;
  if (raw40 >= 19) return 5.5;
  if (raw40 >= 15) return 5.0;
  if (raw40 >= 13) return 4.5;
  if (raw40 >= 10) return 4.0;
  if (raw40 >= 8) return 3.5;
  if (raw40 >= 6) return 3.0;
  if (raw40 >= 4) return 2.5;
  return raw40 > 0 ? 2.0 : 0;
}

function formatReadingTime(seconds) {
  const s = Math.max(0, Math.floor(seconds||0));
  const mm = String(Math.floor(s/60)).padStart(2,"0");
  const ss = String(s%60).padStart(2,"0");
  return `${mm}:${ss}`;
}

function paragraphLetter(i) {
  return String.fromCharCode(65+i);
}

function normalizeReadingQuestion(q, i, sectionIndex, fallbackType) {
  const type = q?.type || fallbackType || "multiple_choice";
  const id = q?.id || `s${sectionIndex+1}q${i+1}`;
  return {
    id:String(id),
    sectionIndex,
    type,
    prompt:q?.prompt || q?.question || "",
    instruction:q?.instruction || "",
    options:Array.isArray(q?.options) ? q.options : [],
    answer:q?.answer ?? "",
    acceptedAnswers:Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [],
    explanation:q?.explanation || "",
    skill:q?.skill || "Reading detail",
    paragraph:q?.paragraph || q?.paragraphRef || "",
    anchor:q?.anchor || "",
    trap:q?.trap || "",
    wordLimit:q?.wordLimit || null,
    group:q?.group || q?.questionGroup || ""
  };
}

function normalizeReadingSection(raw, index, fallbackTopic, fallbackDifficulty, fallbackType) {
  const passage = raw?.passage || raw || {};
  const paragraphs = Array.isArray(passage.paragraphs) ? passage.paragraphs : [];
  const questions = (Array.isArray(raw?.questions) ? raw.questions : [])
    .map((q,i)=>normalizeReadingQuestion(q,i,index,fallbackType))
    .filter(q=>q.prompt && q.answer !== "");
  const id = raw?.id || `section-${index+1}`;
  return {
    id,
    number:index+1,
    title:passage.title || raw?.title || `Academic Reading Passage ${index+1}`,
    topic:passage.topic || raw?.topic || fallbackTopic,
    level:passage.level || raw?.level || fallbackDifficulty,
    sourceNote:passage.sourceNote || raw?.sourceNote || READING_SOURCE_POLICY,
    paragraphs,
    headings:Array.isArray(raw?.headings) ? raw.headings : (Array.isArray(passage.headings) ? passage.headings : []),
    features:Array.isArray(raw?.features) ? raw.features : [],
    vocabulary:Array.isArray(raw?.vocabulary) ? raw.vocabulary : (Array.isArray(passage.vocabulary) ? passage.vocabulary : []),
    questions
  };
}

function normalizeReadingTest(data, fallbackTopic, fallbackDifficulty, fallbackType, fallbackMode="mini") {
  const rawSections = Array.isArray(data?.sections) && data.sections.length
    ? data.sections
    : [{id:"section-1",passage:data?.passage||data,questions:data?.questions||[],headings:data?.headings||[],features:data?.features||[],vocabulary:data?.vocabulary||[]}];
  const sections = rawSections.map((s,i)=>normalizeReadingSection(s,i,fallbackTopic,fallbackDifficulty,fallbackType));
  let n = 1;
  sections.forEach(section=>{
    section.questions.forEach(q=>{
      q.number = n++;
      q.sectionId = section.id;
    });
  });
  const questions = sections.flatMap(s=>s.questions);
  const mode = data?.mode || (sections.length >= 3 ? "full" : fallbackMode);
  const title = data?.title || (sections.length >= 3 ? "Full Academic Reading Test" : sections[0]?.title || "Academic Reading Practice");
  const durationSeconds = Number(data?.durationSeconds) || READING_MODE_META[mode]?.duration || Math.max(600,questions.length*90);
  return {
    id:data?.id || Date.now().toString(36)+Math.random().toString(36).slice(2,7),
    mode,
    title,
    sourcePolicy:data?.sourcePolicy || READING_SOURCE_POLICY,
    durationSeconds,
    sections,
    questions,
    topic:data?.topic || sections[0]?.topic || fallbackTopic,
    level:data?.level || fallbackDifficulty,
    qualityWarnings:Array.isArray(data?.qualityWarnings) ? data.qualityWarnings : []
  };
}

function readingSelectOptions(question, section) {
  if (question.type === "true_false_not_given") return ["TRUE","FALSE","NOT GIVEN"];
  if (question.type === "yes_no_not_given") return ["YES","NO","NOT GIVEN"];
  if (question.type === "matching_information") {
    return question.options?.length ? question.options : (section?.paragraphs||[]).map((_,i)=>paragraphLetter(i));
  }
  if (question.type === "matching_headings") return question.options?.length ? question.options : (section?.headings||[]);
  if (question.type === "matching_features") return question.options?.length ? question.options : (section?.features||[]);
  if (question.type === "matching_sentence_endings") return question.options || [];
  if (question.type === "multiple_choice") return question.options || [];
  return [];
}

function plainSectionText(section) {
  return (section?.paragraphs || []).join(" ");
}

function validateReadingTest(test, expectedTotal=null) {
  const warnings = [];
  const add = (severity, message) => warnings.push({severity,message});
  if (!test.sections.length) add("error","No reading sections were generated.");
  if (test.mode === "full" && test.sections.length !== 3) add("error","A full test must contain exactly 3 passages.");
  if (expectedTotal && test.questions.length !== expectedTotal) add(test.mode==="full"?"error":"warning",`Expected ${expectedTotal} questions, got ${test.questions.length}.`);
  const seen = new Set();
  test.sections.forEach((section,si)=>{
    if (section.paragraphs.length < 3) add("warning",`Section ${si+1} has fewer than 3 paragraphs.`);
    const sectionText = normalizeReadingAnswer(plainSectionText(section));
    section.questions.forEach(q=>{
      if (seen.has(q.id)) add("warning",`Duplicate question id: ${q.id}.`);
      seen.add(q.id);
      if (!READING_TYPES.some(t=>t.id===q.type)) add("warning",`Question ${q.number} uses unknown type "${q.type}".`);
      if (q.type === "true_false_not_given" && !["TRUE","FALSE","NOT GIVEN"].includes(String(q.answer).toUpperCase())) add("error",`Question ${q.number} has invalid TFNG answer.`);
      if (q.type === "yes_no_not_given" && !["YES","NO","NOT GIVEN"].includes(String(q.answer).toUpperCase())) add("error",`Question ${q.number} has invalid YNNG answer.`);
      if (READING_COMPLETION_TYPES.includes(q.type)) {
        const answers = [q.answer, ...(q.acceptedAnswers||[])].filter(Boolean).map(normalizeReadingAnswer);
        if (!answers.some(a=>a && sectionText.includes(a))) add("warning",`Question ${q.number} answer may not be taken exactly from the passage.`);
        if (!readingWordLimit(q)) add("warning",`Question ${q.number} is a completion item without a word limit.`);
      }
      if (READING_SELECT_TYPES.includes(q.type)) {
        const opts = readingSelectOptions(q, section).map(readingChoiceValue).map(normalizeReadingAnswer);
        if (opts.length && !opts.includes(normalizeReadingAnswer(q.answer))) add("warning",`Question ${q.number} answer is not in its option list.`);
      }
      if (q.anchor && !sectionText.includes(normalizeReadingAnswer(q.anchor))) add("warning",`Question ${q.number} anchor is not an exact phrase in the passage.`);
    });
  });
  return warnings;
}

function makeDemoReadingTest() {
  return normalizeReadingTest({
    mode:"section",
    sourcePolicy:READING_SOURCE_POLICY,
    durationSeconds:1200,
    sections:[{
      passage:{
        title:"The Slow Return of Urban Wetlands",
        topic:"environment and climate",
        level:"Band 7.0",
        sourceNote:READING_SOURCE_POLICY,
        paragraphs:[
          "For much of the twentieth century, wetlands within large cities were treated as inconvenient spaces. They were drained for roads, filled for housing, or hidden behind industrial land. In recent decades, however, planners have begun to reassess their value. A wetland can store rainwater during storms, filter pollutants before they reach rivers, and provide cooler air during heatwaves.",
          "The change in attitude has been driven partly by cost. Concrete drainage systems are expensive to expand, especially when rainfall becomes less predictable. Restored wetlands cannot replace engineered infrastructure entirely, but they can reduce pressure on it. In one coastal district, a network of ponds and reed beds lowered peak flood levels after heavy rain, while also creating public walking routes.",
          "There are trade-offs. Wetlands require space, and land in cities is politically sensitive. Some residents worry about mosquitoes or unpleasant smells, although these problems are usually linked to poor water movement rather than wetlands themselves. Successful projects therefore depend on careful design, regular maintenance, and clear communication with local communities.",
          "Researchers caution that the benefits should not be exaggerated. A small wetland beside an apartment block will not solve regional flooding. Yet when many small sites are connected, they can form a useful environmental system. The most effective urban wetland schemes are those treated not as decoration, but as working parts of the city."
        ]
      },
      headings:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],
      questions:[
        {id:"demo1",type:"matching_headings",prompt:"Paragraph A",options:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],answer:"iii",explanation:"Paragraph A explains that wetlands used to be drained, filled, or hidden.",skill:"main idea",paragraph:"A"},
        {id:"demo2",type:"matching_headings",prompt:"Paragraph B",options:["i. A limited but useful role","ii. Public fears and design conditions","iii. Earlier attitudes to urban wetlands","iv. Cost pressures behind restoration","v. A complete solution to city flooding"],answer:"iv",explanation:"Paragraph B focuses on drainage costs and pressure on infrastructure.",skill:"main idea",paragraph:"B"},
        {id:"demo3",type:"true_false_not_given",prompt:"In the twentieth century, urban wetlands were often removed or concealed.",answer:"TRUE",explanation:"Paragraph A says they were drained, filled, or hidden.",skill:"locating detail",paragraph:"A",anchor:"drained for roads, filled for housing, or hidden"},
        {id:"demo4",type:"true_false_not_given",prompt:"Restored wetlands can completely replace concrete drainage systems.",answer:"FALSE",explanation:"Paragraph B says they cannot replace engineered infrastructure entirely.",skill:"distinguishing contradiction",paragraph:"B",anchor:"cannot replace engineered infrastructure entirely"},
        {id:"demo5",type:"true_false_not_given",prompt:"The coastal district project was opposed by most local residents.",answer:"NOT GIVEN",explanation:"Opposition in that district is not mentioned.",skill:"not given recognition",paragraph:"B"},
        {id:"demo6",type:"multiple_choice",prompt:"What is one reason planners have become more interested in wetlands?",options:["A. They are cheaper to build than all roads.","B. They can reduce pressure on drainage systems.","C. They remove the need for public parks.","D. They prevent all heatwaves."],answer:"B",explanation:"Paragraph B says restored wetlands can reduce pressure on drainage infrastructure.",skill:"detail",paragraph:"B"},
        {id:"demo7",type:"sentence_completion",instruction:"NO MORE THAN TWO WORDS",prompt:"Wetlands can filter pollutants before they reach ____.",answer:"rivers",acceptedAnswers:["the rivers"],wordLimit:2,explanation:"Paragraph A mentions filtering pollutants before they reach rivers.",skill:"word matching",paragraph:"A",anchor:"before they reach rivers"},
        {id:"demo8",type:"short_answer",instruction:"NO MORE THAN ONE WORD",prompt:"What problem do residents sometimes associate with wetlands besides unpleasant smells?",answer:"mosquitoes",wordLimit:1,explanation:"Paragraph C names mosquitoes and smells.",skill:"scanning",paragraph:"C",anchor:"mosquitoes or unpleasant smells"},
        {id:"demo9",type:"multiple_choice",prompt:"According to the final paragraph, small wetlands are most useful when they are...",options:["A. privately owned.","B. connected with other sites.","C. built beside every apartment.","D. used mainly as decoration."],answer:"B",explanation:"Paragraph D says connected small sites can form a useful environmental system.",skill:"inference",paragraph:"D"},
        {id:"demo10",type:"sentence_completion",instruction:"NO MORE THAN ONE WORD",prompt:"The best schemes treat wetlands as ____ parts of the city.",answer:"working",wordLimit:1,explanation:"The final sentence says they are working parts of the city.",skill:"sentence completion",paragraph:"D",anchor:"working parts of the city"}
      ],
      vocabulary:[
        {word:"reassess",meaning:"consider again"},
        {word:"infrastructure",meaning:"basic physical systems of a city"},
        {word:"trade-offs",meaning:"disadvantages accepted for benefits"}
      ]
    }]
  },"environment and climate","Band 7.0","mixed","section");
}

// ─── MULTI-STEP READING GENERATION ──────────────────────────────────────────

function formatWithLabels(paragraphs) {
  return paragraphs.map(p => `[Paragraph ${p.label}]\n${p.text}`).join("\n\n");
}

function buildPassagePrompt(topic, sectionDifficulty, targetBand, fewShotExamples, sourceText, correctiveNote) {
  const targetWords = sectionDifficulty === 1 ? 700 : sectionDifficulty === 2 ? 800 : 880;
  const shots = (fewShotExamples || []).filter(Boolean);
  const fewShotBlock = shots.length > 0
    ? `\nFEW-SHOT REFERENCE${shots.length>1?"S":""} (match this style, structure, register, and density — do NOT copy content or reuse facts):\n${shots.map((e,i)=>`--- Reference ${i+1} ---\n${formatFewShotPassage(e)}`).join("\n\n")}\n\nAVOID overlapping with the reference topic — your passage must cover different facts, examples, and arguments.\n`
    : "";
  const sourceBlock = sourceText && String(sourceText).trim().length > 200
    ? `\nSOURCE MATERIAL — use ONLY facts (names, dates, numbers, places, expert names, mechanisms) that appear in this text. Do not invent statistics or attribute claims to people not mentioned here. Paraphrase heavily:\n${String(sourceText).slice(0,8000)}\n`
    : "";
  const corrective = correctiveNote ? `\nCRITICAL CORRECTION: ${correctiveNote}\n` : "";
  return {
    maxTokens: 4000,
    system: `You are an IELTS Academic Reading passage editor with 15 years of Cambridge Assessment experience. You produce passages indistinguishable from official Cambridge IELTS materials. Return only strict JSON.`,
    user: `Write an original IELTS Academic Reading passage.

TOPIC: ${topic}
SECTION DIFFICULTY: ${sectionDifficulty} (1=easier, 2=medium, 3=harder/more academic)
TARGET BAND: ${targetBand}
${sourceBlock}${fewShotBlock}${corrective}

REQUIREMENTS:
- Length: ${targetWords} words (±50 tolerance)
- Register: formal academic, third person only, no contractions, no colloquialisms, no rhetorical questions
- Structure: 6-8 paragraphs labeled A–H; each paragraph has ONE clear central idea
- First paragraph: introduces topic, hooks reader, gives context
- Middle paragraphs: develop different aspects (history, mechanism, examples, debates)
- Final paragraph: implications, future outlook, or unresolved questions
- At least ONE paragraph with a nuanced/contested claim (essential for T/F/NG questions)
- At least ONE paragraph contrasting two viewpoints or approaches
- 8-12 academic words at B2-C1 level; 2-4 discipline-specific terms with context clues
- Mix sentence lengths; passive voice ~25%; vary sentence openings
- Content: 3-5 specific data points (years, percentages, names, places); 1 named expert with paraphrased view; 1 historical reference; 1 mechanism/process explanation
- Avoid: bullet points, subheadings, "AI tells" phrases (furthermore/it should be noted/in conclusion), Wikipedia-style openings

Return strict JSON:
{"title":"Compelling academic title (5-10 words)","paragraphs":[{"label":"A","text":"full paragraph text"},{"label":"B","text":"full paragraph text"}],"word_count":${targetWords},"topic_tags":["tag1","tag2"]}`
  };
}

function buildTFNGPrompt(passageText, n, nTrue, nFalse, nNG, variant) {
  const isYN = variant === "ynng";
  const trueWord = isYN ? "YES" : "TRUE";
  const falseWord = isYN ? "NO" : "FALSE";
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for ${isYN ? "Yes/No/Not Given" : "True/False/Not Given"} questions. Return only strict JSON.`,
    user: `Write ${n} ${isYN ? "Yes/No/Not Given" : "True/False/Not Given"} questions based on this passage.

PASSAGE:
${passageText}

REQUIRED MIX: ${nTrue} ${trueWord}, ${nFalse} ${falseWord}, ${nNG} NOT GIVEN
ORDER: questions must follow passage order (Q1 from early paragraphs, last Q from late paragraphs)

RULES:
- ${trueWord}: paraphrase using synonyms, changed voice, restructured sentence — never copy 5+ consecutive words
- ${falseWord}: DIRECTLY contradicts a specific passage claim (opposite number, wrong cause, wrong agent) — not just absent
- NOT GIVEN: plausible statement, related topic, but NO sentence confirms or denies it

TRAPS to include: synonym swap, active↔passive voice, opposite quantifier (all/some), wrong attribution

DO NOT: confuse ${falseWord} with NOT GIVEN; copy 5+ words verbatim; make statements answerable without reading

Return strict JSON:
{"questions":[{"order":1,"statement":"...","answer":"${trueWord}","evidence":{"paragraph":"B","sentence_quote":"exact sentence from passage","reasoning":"why this answer"},"trap_type":"synonym_swap"}]}`
  };
}

function buildMCQPrompt(passageText, n) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Multiple Choice questions. Return only strict JSON.`,
    user: `Write ${n} multiple choice questions based on this passage.

PASSAGE:
${passageText}

REQUIREMENTS:
- Each question: 1 correct answer + 3 distractors
- Include at least 1 detail question, 1 inference or author's-view question
- Vary subtypes: detail, main idea, inference, author's view, vocabulary-in-context
- Stems must be specific ("According to paragraph C, the primary reason X happens is...")

DISTRACTOR TYPES (use at least 2 per question):
- Type A: true information but doesn't answer the question
- Type B: partially correct (half matches, half wrong)
- Type C: reasonable assumption not stated in passage
- Type D: opposite of what passage says

AVOID: options dramatically different in length; "all/none of the above"; overlapping options; correct answer always B or C

Return strict JSON:
{"questions":[{"order":1,"question":"According to paragraph C, the primary reason...","question_subtype":"detail","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"B","evidence":{"paragraph":"C","sentence_quote":"...","why_correct":"..."}}]}`
  };
}

function buildMatchingHeadingsPrompt(passageText, paragraphLabels) {
  const labelsStr = Array.isArray(paragraphLabels) ? paragraphLabels.join(",") : String(paragraphLabels || "");
  const n = labelsStr.split(",").filter(Boolean).length;
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Matching Headings questions. Return only strict JSON.`,
    user: `Write matching headings questions for this passage.

PASSAGE:
${passageText}

PARAGRAPHS TO MATCH: ${labelsStr}

RULES:
- Each heading: 4-10 words, noun phrase, captures MAIN IDEA not a detail
- Heading must NOT contain verbatim words from the paragraph's topic sentence
- Generate ${n} correct headings + 3 distractor headings (${n + 3} total)
- Each distractor must be plausible and match a DETAIL or sub-idea, not the main idea
- No two headings should fit the same paragraph equally well

Return strict JSON:
{"headings_list":[{"roman":"i","text":"..."}],"matches":[{"paragraph":"B","correct_heading":"iii","why":"paragraph B main idea is X, heading iii paraphrases as Y","tempting_distractor":"vii"}],"unused_headings":["i","v"]}`
  };
}

function buildSentenceCompletionPrompt(passageText, n, wordLimit) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Sentence Completion questions. Return only strict JSON.`,
    user: `Write ${n} sentence completion questions. Answers must be exact words from the passage.

PASSAGE:
${passageText}

WORD LIMIT: ${wordLimit}

RULES:
- Sentence stems PARAPHRASE the passage (never copy 4+ consecutive words)
- Answers fit grammatically in the blank
- Each answer uniquely determinable — only one correct answer exists in passage

AVOID: blanks fillable by multiple different answers; stems copying too much; answers requiring word-form changes

Return strict JSON:
{"instruction":"Complete the sentences below. Choose ${wordLimit} from the passage for each answer.","questions":[{"order":1,"sentence_with_blank":"The researchers found that the compound was responsible for __________.","answer":"cellular regeneration","evidence":{"paragraph":"D","sentence_quote":"exact sentence","paraphrase_check":"stem uses X, passage uses Y"}}]}`
  };
}

function buildSummaryCompletionPrompt(passageText, startPara, endPara, n, wordLimit) {
  return {
    maxTokens: 3000,
    system: `You are a Cambridge IELTS item writer for Summary Completion questions. Return only strict JSON.`,
    user: `Write a summary completion task covering paragraphs ${startPara} to ${endPara} of this passage.

PASSAGE:
${passageText}

NUMBER OF BLANKS: ${n}
WORD LIMIT PER BLANK: ${wordLimit}

RULES:
- Summary covers ONLY paragraphs ${startPara} to ${endPara}
- Summary is in YOUR words (paraphrase), not copied from passage
- Each blank: 1-3 words from passage; must be a key content word (noun, verb, adjective)
- Blanks distributed throughout the summary (not all clustered)
- Use [1]___ notation for blanks in the summary text

AVOID: copying sentence structure; multiple valid answers per blank; distorting meaning

Return strict JSON:
{"instruction":"Complete the summary below. Use ${wordLimit} from the passage for each answer.","summary_text":"The discovery of [1]___ in the 1960s transformed...","blanks":[{"number":1,"answer":"bioluminescent bacteria","evidence_paragraph":"B","evidence_sentence":"exact sentence from passage"}]}`
  };
}

function buildShortAnswerPrompt(passageText, n, wordLimit) {
  return {
    maxTokens: 2500,
    system: `You are a Cambridge IELTS item writer for Short Answer questions. Return only strict JSON.`,
    user: `Write ${n} short answer questions. Answers must be exact words from the passage.

PASSAGE:
${passageText}

WORD LIMIT: ${wordLimit}

RULES:
- Questions start with Wh- words (What, Where, When, Who, Why, How, Which)
- Answers are exact words/phrases from passage — uniquely determinable
- Questions are paraphrased, not copied from passage
- Good for: facts, names, processes, locations, dates, causes

Return strict JSON:
{"instruction":"Answer the questions below. Use ${wordLimit} from the passage for each answer.","questions":[{"order":1,"question":"What compound produces the glow in fireflies?","answer":"luciferin","alternative_answers":["luciferin"],"evidence":{"paragraph":"C","sentence_quote":"exact sentence"}}]}`
  };
}

// ─── QUESTION CONVERTERS (tool JSON → app question objects) ──────────────────

function convertTFNGQuestions(raw) {
  return (raw.questions || []).map(q => ({
    type: "true_false_not_given",
    prompt: q.statement || "",
    answer: q.answer || "NOT GIVEN",
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: q.trap_type || "",
    skill: "Detail / inference"
  }));
}

function convertYNNGQuestions(raw) {
  return (raw.questions || []).map(q => ({
    type: "yes_no_not_given",
    prompt: q.statement || "",
    answer: q.answer || "NOT GIVEN",
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: q.trap_type || "",
    skill: "Author opinion"
  }));
}

function convertMCQQuestions(raw) {
  return (raw.questions || []).map(q => {
    const opts = q.options || {};
    const options = Object.entries(opts).map(([k, v]) => `${k}. ${v}`);
    return {
      type: "multiple_choice",
      prompt: q.question || "",
      options,
      answer: q.answer || "A",
      explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.why_correct || ""}` : "",
      paragraph: q.evidence?.paragraph || "",
      anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
      trap: q.question_subtype || "",
      skill: "Comprehension"
    };
  });
}

function convertMatchingHeadingsQuestions(raw) {
  const headingsList = (raw.headings_list || []).map(h => `${h.roman}. ${h.text}`);
  return (raw.matches || []).map(m => ({
    type: "matching_headings",
    prompt: `Paragraph ${m.paragraph}`,
    options: headingsList,
    answer: m.correct_heading || "",
    explanation: m.why || "",
    paragraph: m.paragraph || "",
    anchor: "",
    trap: m.tempting_distractor ? `Distractor: ${m.tempting_distractor}` : "",
    skill: "Main idea"
  }));
}

function convertSentenceCompletionQuestions(raw) {
  const inst = raw.instruction || "Complete the sentences. Use NO MORE THAN TWO WORDS from the passage.";
  return (raw.questions || []).map(q => ({
    type: "sentence_completion",
    prompt: q.sentence_with_blank || "",
    instruction: inst,
    answer: q.answer || "",
    wordLimit: 2,
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${q.evidence.paraphrase_check || ""}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 120),
    trap: "",
    skill: "Detail and vocabulary"
  }));
}

function convertSummaryCompletionQuestions(raw) {
  const inst = raw.instruction || "Complete the summary. Use NO MORE THAN TWO WORDS from the passage.";
  const summaryText = raw.summary_text || "";
  return (raw.blanks || []).map(b => {
    const sentences = summaryText.split(/(?<=[.!?])\s+/);
    const blankMarker = `[${b.number}]___`;
    const contextSentence = sentences.find(s => s.includes(blankMarker)) || `See summary: ${blankMarker}`;
    return {
      type: "summary_completion",
      prompt: contextSentence,
      instruction: inst,
      answer: b.answer || "",
      wordLimit: 2,
      explanation: `Paragraph ${b.evidence_paragraph}: ${b.evidence_sentence || ""}`,
      paragraph: b.evidence_paragraph || "",
      anchor: (b.evidence_sentence || "").slice(0, 120),
      trap: "",
      skill: "Summary comprehension",
      group: summaryText
    };
  });
}

function convertShortAnswerQuestions(raw) {
  const inst = raw.instruction || "Answer the questions. Use NO MORE THAN THREE WORDS from the passage.";
  return (raw.questions || []).map(q => ({
    type: "short_answer",
    prompt: q.question || "",
    instruction: inst,
    answer: q.answer || "",
    acceptedAnswers: q.alternative_answers || [],
    wordLimit: 3,
    explanation: q.evidence ? `Paragraph ${q.evidence.paragraph}: ${(q.evidence.sentence_quote || "").slice(0, 100)}` : "",
    paragraph: q.evidence?.paragraph || "",
    anchor: (q.evidence?.sentence_quote || "").slice(0, 100),
    trap: "",
    skill: "Fact retrieval"
  }));
}

function buildAndConvertQuestions(qGroup, passageText) {
  const {type, params} = qGroup;
  const tfngN = params.n || 4;
  const nTrue = params.nTrue ?? Math.max(1, Math.floor(tfngN * 0.4));
  const nFalse = params.nFalse ?? Math.max(1, Math.floor(tfngN * 0.35));
  const nNG = params.nNG ?? Math.max(0, tfngN - nTrue - nFalse);
  switch (type) {
    case "tfng": return {prompt: buildTFNGPrompt(passageText, tfngN, nTrue, nFalse, nNG, "tfng"), convert: convertTFNGQuestions};
    case "ynng": return {prompt: buildTFNGPrompt(passageText, tfngN, nTrue, nFalse, nNG, "ynng"), convert: convertYNNGQuestions};
    case "mcq": return {prompt: buildMCQPrompt(passageText, params.n || 3), convert: convertMCQQuestions};
    case "matching_headings": return {prompt: buildMatchingHeadingsPrompt(passageText, params.paragraphLabels || "B,C,D,E"), convert: convertMatchingHeadingsQuestions};
    case "sentence_completion": return {prompt: buildSentenceCompletionPrompt(passageText, params.n || 3, params.wordLimit || "NO MORE THAN TWO WORDS"), convert: convertSentenceCompletionQuestions};
    case "summary_completion": return {prompt: buildSummaryCompletionPrompt(passageText, params.startPara || "B", params.endPara || "D", params.n || 5, params.wordLimit || "NO MORE THAN TWO WORDS"), convert: convertSummaryCompletionQuestions};
    case "short_answer": return {prompt: buildShortAnswerPrompt(passageText, params.n || 3, params.wordLimit || "NO MORE THAN THREE WORDS"), convert: convertShortAnswerQuestions};
    default: return null;
  }
}

function extractHeadingOptions(questions) {
  const mq = questions.find(q => q.type === "matching_headings" && Array.isArray(q.options) && q.options.length);
  return mq ? mq.options : [];
}

function getReadingQuestionMix(mode, focusType, questionCount, paragraphLabels, section) {
  const midLabels = paragraphLabels.slice(1, paragraphLabels.length - 1).join(",") || paragraphLabels.join(",");
  const startPara = paragraphLabels[1] || paragraphLabels[0];
  const endPara = paragraphLabels[Math.min(3, paragraphLabels.length - 1)];

  if (mode === "full") {
    if (section === 1) return [
      {type:"tfng", label:"T/F/NG", params:{n:4,nTrue:1,nFalse:2,nNG:1}},
      {type:"mcq", label:"multiple choice", params:{n:3}},
      {type:"short_answer", label:"short answer", params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}},
      {type:"sentence_completion", label:"sentence completion", params:{n:3,wordLimit:"NO MORE THAN TWO WORDS"}}
    ];
    if (section === 2) return [
      {type:"matching_headings", label:"matching headings", params:{paragraphLabels:midLabels}},
      {type:"summary_completion", label:"summary completion", params:{startPara,endPara,n:5,wordLimit:"NO MORE THAN TWO WORDS"}},
      {type:"mcq", label:"multiple choice", params:{n:3}}
    ];
    return [
      {type:"tfng", label:"T/F/NG", params:{n:5,nTrue:1,nFalse:2,nNG:2}},
      {type:"mcq", label:"multiple choice", params:{n:4}},
      {type:"matching_headings", label:"matching headings", params:{paragraphLabels:midLabels}}
    ];
  }

  const SECTION_MIXES = {
    "mixed": [{type:"tfng",label:"T/F/NG",params:{n:4,nTrue:1,nFalse:2,nNG:1}},{type:"mcq",label:"multiple choice",params:{n:4}},{type:"short_answer",label:"short answer",params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}},{type:"sentence_completion",label:"sentence completion",params:{n:2,wordLimit:"NO MORE THAN TWO WORDS"}}],
    "true_false_not_given": [{type:"tfng",label:"T/F/NG",params:{n:7,nTrue:2,nFalse:3,nNG:2}},{type:"mcq",label:"multiple choice",params:{n:3}},{type:"short_answer",label:"short answer",params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}}],
    "yes_no_not_given": [{type:"ynng",label:"Y/N/NG",params:{n:7}},{type:"mcq",label:"multiple choice",params:{n:3}},{type:"short_answer",label:"short answer",params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}}],
    "multiple_choice": [{type:"mcq",label:"multiple choice",params:{n:7}},{type:"tfng",label:"T/F/NG",params:{n:3,nTrue:1,nFalse:1,nNG:1}},{type:"short_answer",label:"short answer",params:{n:3,wordLimit:"NO MORE THAN THREE WORDS"}}],
    "matching_headings": [{type:"matching_headings",label:"matching headings",params:{paragraphLabels:midLabels}},{type:"summary_completion",label:"summary completion",params:{startPara,endPara,n:5,wordLimit:"NO MORE THAN TWO WORDS"}},{type:"mcq",label:"multiple choice",params:{n:3}}],
    "sentence_completion": [{type:"sentence_completion",label:"sentence completion",params:{n:6,wordLimit:"NO MORE THAN TWO WORDS"}},{type:"tfng",label:"T/F/NG",params:{n:4,nTrue:1,nFalse:2,nNG:1}},{type:"mcq",label:"multiple choice",params:{n:3}}],
    "summary_completion": [{type:"summary_completion",label:"summary completion",params:{startPara,endPara,n:6,wordLimit:"NO MORE THAN TWO WORDS"}},{type:"tfng",label:"T/F/NG",params:{n:4,nTrue:1,nFalse:2,nNG:1}},{type:"mcq",label:"multiple choice",params:{n:3}}],
    "short_answer": [{type:"short_answer",label:"short answer",params:{n:6,wordLimit:"NO MORE THAN THREE WORDS"}},{type:"tfng",label:"T/F/NG",params:{n:4,nTrue:1,nFalse:2,nNG:1}},{type:"mcq",label:"multiple choice",params:{n:3}}],
  };

  if (mode === "section") return SECTION_MIXES[focusType] || SECTION_MIXES["mixed"];

  // Mini mode — scale to questionCount
  const half = Math.ceil(questionCount / 2);
  const rest = questionCount - half;
  const MINI_MIXES = {
    "mixed": [{type:"tfng",label:"T/F/NG",params:{n:half,nTrue:Math.max(1,Math.floor(half*0.4)),nFalse:Math.max(1,Math.floor(half*0.35)),nNG:Math.max(0,half-Math.floor(half*0.4)-Math.floor(half*0.35))}},{type:"mcq",label:"multiple choice",params:{n:rest}}],
    "true_false_not_given": [{type:"tfng",label:"T/F/NG",params:{n:half+1,nTrue:2,nFalse:2,nNG:Math.max(0,half-3)}},{type:"mcq",label:"multiple choice",params:{n:Math.max(2,rest-1)}}],
    "yes_no_not_given": [{type:"ynng",label:"Y/N/NG",params:{n:half+1}},{type:"mcq",label:"multiple choice",params:{n:Math.max(2,rest-1)}}],
    "multiple_choice": [{type:"mcq",label:"multiple choice",params:{n:half+1}},{type:"tfng",label:"T/F/NG",params:{n:Math.max(2,rest-1),nTrue:1,nFalse:1,nNG:Math.max(0,rest-3)}}],
    "matching_headings": [{type:"matching_headings",label:"matching headings",params:{paragraphLabels:midLabels}},{type:"mcq",label:"multiple choice",params:{n:3}}],
    "sentence_completion": [{type:"sentence_completion",label:"sentence completion",params:{n:half,wordLimit:"NO MORE THAN TWO WORDS"}},{type:"mcq",label:"multiple choice",params:{n:rest}}],
    "summary_completion": [{type:"summary_completion",label:"summary completion",params:{startPara,endPara,n:half,wordLimit:"NO MORE THAN TWO WORDS"}},{type:"mcq",label:"multiple choice",params:{n:rest}}],
    "short_answer": [{type:"short_answer",label:"short answer",params:{n:half,wordLimit:"NO MORE THAN THREE WORDS"}},{type:"mcq",label:"multiple choice",params:{n:rest}}],
  };
  return MINI_MIXES[focusType] || MINI_MIXES["mixed"];
}

// ─── LIBRARY IMPORT CONVERTER (Python tool JSON → app format) ────────────────

function convertToolPassageToApp(toolJson) {
  const passage = toolJson.passage || {};
  const paragraphs = (passage.paragraphs || []).map(p => typeof p === "string" ? p : (p.text || ""));
  const questions = [];
  for (const q of (toolJson.questions || [])) {
    if (q.type === "tfng") {
      questions.push({type:"true_false_not_given",prompt:q.statement||"",answer:q.answer||"NOT GIVEN",explanation:q.evidence?`Paragraph ${q.evidence.paragraph}: ${q.evidence.reasoning||""}`:"",paragraph:q.evidence?.paragraph||"",anchor:(q.evidence?.sentence_quote||"").slice(0,120),trap:q.trap_type||"",skill:"Detail / inference"});
    } else if (q.type === "mcq") {
      const opts = q.options || {};
      const options = Object.entries(opts).map(([k,v])=>`${k}. ${v}`);
      questions.push({type:"multiple_choice",prompt:q.question||"",options,answer:q.answer||"A",explanation:q.evidence?`Paragraph ${q.evidence.paragraph}: ${q.evidence.why_correct||""}`:"",paragraph:q.evidence?.paragraph||"",anchor:(q.evidence?.sentence_quote||"").slice(0,120),trap:"",skill:"Comprehension"});
    } else if (q.type === "matching_headings") {
      const headingsList = (q.headings_list||[]).map(h=>`${h.roman}. ${h.text}`);
      for (const m of (q.matches||[])) {
        questions.push({type:"matching_headings",prompt:`Paragraph ${m.paragraph}`,options:headingsList,answer:m.correct_heading||"",explanation:m.why||"",paragraph:m.paragraph||"",anchor:"",trap:m.tempting_distractor?`Distractor: ${m.tempting_distractor}`:"",skill:"Main idea"});
      }
    } else if (q.type === "summary_completion") {
      const inst = q.instruction || "Complete the summary. Use NO MORE THAN TWO WORDS from the passage.";
      const summaryText = q.summary_text || "";
      for (const b of (q.blanks||[])) {
        const sentences = summaryText.split(/(?<=[.!?])\s+/);
        const blankMarker = `[${b.number}]___`;
        const ctx = sentences.find(s=>s.includes(blankMarker)) || `See summary: ${blankMarker}`;
        questions.push({type:"summary_completion",prompt:ctx,instruction:inst,answer:b.answer||"",wordLimit:2,explanation:`Paragraph ${b.evidence_paragraph}: ${b.evidence_sentence||""}`,paragraph:b.evidence_paragraph||"",anchor:(b.evidence_sentence||"").slice(0,120),trap:"",skill:"Summary comprehension",group:summaryText});
      }
    } else if (q.type === "sentence_completion") {
      const inst = q.instruction || "Complete the sentences. Use NO MORE THAN TWO WORDS from the passage.";
      for (const sq of (q.questions||[])) {
        questions.push({type:"sentence_completion",prompt:sq.sentence_with_blank||"",instruction:inst,answer:sq.answer||"",wordLimit:2,explanation:sq.evidence?`Paragraph ${sq.evidence.paragraph}: ${sq.evidence.paraphrase_check||""}`:"",paragraph:sq.evidence?.paragraph||"",anchor:(sq.evidence?.sentence_quote||"").slice(0,120),trap:"",skill:"Detail and vocabulary"});
      }
    } else if (q.type === "short_answer") {
      const inst = q.instruction || "Answer the questions. Use NO MORE THAN THREE WORDS from the passage.";
      for (const sq of (q.questions||[])) {
        questions.push({type:"short_answer",prompt:sq.question||"",instruction:inst,answer:sq.answer||"",acceptedAnswers:sq.alternative_answers||[],wordLimit:3,explanation:sq.evidence?`Paragraph ${sq.evidence.paragraph}: ${(sq.evidence.sentence_quote||"").slice(0,100)}`:"",paragraph:sq.evidence?.paragraph||"",anchor:(sq.evidence?.sentence_quote||"").slice(0,100),trap:"",skill:"Fact retrieval"});
      }
    }
  }
  return {
    mode: "section",
    title: passage.title || toolJson.id || "Imported Passage",
    durationSeconds: 1200,
    sourcePolicy: READING_SOURCE_POLICY,
    importedFrom: "reading-tool",
    importedId: toolJson.id,
    sections: [{
      id: "section-1",
      passage: {title:passage.title||"",topic:(passage.topic_tags||[]).join(", ")||"Academic",level:`Band ${passage.estimated_band||7.0}`,sourceNote:READING_SOURCE_POLICY,paragraphs},
      headings: [],
      features: [],
      questions,
      vocabulary: []
    }]
  };
}

// ─── DATASET HELPERS (few-shot bank built from saved passages) ───────────────

function formatFewShotPassage(entry) {
  if (!entry?.testData?.sections?.[0]) return "";
  const passage = entry.testData.sections[0].passage || {};
  const paragraphs = passage.paragraphs || [];
  const labels = entry.paragraphLabels || paragraphs.map((_, i) => String.fromCharCode(65 + i));
  return `TITLE: ${entry.title || passage.title || "Untitled"}\n\n` +
    paragraphs.map((text, i) => `[Paragraph ${labels[i] || String.fromCharCode(65+i)}]\n${text}`).join("\n\n");
}

function pickFewShotExamples(dataset, topic, section, count) {
  const want = Math.max(0, count || 1);
  if (want === 0) return [];
  const available = (dataset || []).filter(e => e && e.useAsFewShot !== false && e.testData?.sections?.[0]);
  if (available.length === 0) return [];
  const topicLower = String(topic || "").toLowerCase();
  const topicMatches = available.filter(e =>
    String(e.topic || "").toLowerCase().includes(topicLower) ||
    (e.topicTags || []).some(t => topicLower.includes(String(t).toLowerCase()) || String(t).toLowerCase().includes(topicLower))
  );
  const sectionMatches = available.filter(e => e.section === section);
  // Prefer matches on topic, then section, then anything
  const pool = topicMatches.length > 0 ? topicMatches : (sectionMatches.length > 0 ? sectionMatches : available);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, want);
}

function sectionFromBand(level) {
  const n = parseFloat(String(level || "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return 2;
  return n >= 8 ? 3 : n >= 7 ? 2 : 1;
}

function buildDatasetEntryFromTest(testData, source, sectionIdx) {
  const idx = sectionIdx || 0;
  const section = testData?.sections?.[idx];
  if (!section) return null;
  const passage = section.passage || {};
  const paragraphs = passage.paragraphs || [];
  const wordCount = paragraphs.reduce((sum, p) => sum + (typeof p === "string" ? p.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  return {
    id: `${source}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_${idx}`,
    source,
    title: section.title || passage.title || testData.title || "Untitled",
    topic: passage.topic || section.topic || "",
    topicTags: passage.topic_tags || [],
    level: passage.level || section.level || "",
    section: sectionFromBand(passage.level || section.level),
    questionCount: (section.questions || []).length,
    wordCount,
    paragraphLabels: paragraphs.map((_, i) => String.fromCharCode(65 + i)),
    testData: {
      mode: "section",
      title: section.title || passage.title || "Untitled",
      durationSeconds: 1200,
      sourcePolicy: testData.sourcePolicy || READING_SOURCE_POLICY,
      sections: [{...section, id: "section-1"}]
    },
    useAsFewShot: true,
    createdAt: new Date().toISOString()
  };
}

// ─── WIKIPEDIA SOURCING (CORS-enabled REST API) ──────────────────────────────

async function fetchWikipediaSource(subject) {
  const query = String(subject || "").trim();
  if (!query) throw new Error("No subject provided.");
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
  let searchData;
  try {
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`Wikipedia search HTTP ${searchRes.status}`);
    searchData = await searchRes.json();
  } catch(e) { throw new Error(`Wikipedia search failed: ${e.message}`); }
  const title = searchData?.[1]?.[0];
  const url = searchData?.[3]?.[0];
  if (!title) throw new Error(`No Wikipedia article found for "${query}". Try a more specific term.`);
  const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exlimit=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*&redirects=1`;
  let extractData;
  try {
    const extractRes = await fetch(extractUrl);
    if (!extractRes.ok) throw new Error(`Wikipedia fetch HTTP ${extractRes.status}`);
    extractData = await extractRes.json();
  } catch(e) { throw new Error(`Wikipedia fetch failed: ${e.message}`); }
  const pages = extractData?.query?.pages || {};
  const page = Object.values(pages)[0];
  const text = String(page?.extract || "").trim();
  if (text.length < 1000) throw new Error(`Wikipedia article "${title}" has too little content (${text.length} chars) for a reliable source.`);
  return { title, url: url || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, text: text.slice(0, 8000) };
}

// ─── AI-TELL DETECTION + AUTO-RETRY ──────────────────────────────────────────

const AI_TELL_PATTERNS = [
  {re: /\bit is important to note\b/i, label: "it is important to note"},
  {re: /\bit should be noted\b/i, label: "it should be noted"},
  {re: /\bin conclusion\b/i, label: "in conclusion"},
  {re: /\bto conclude\b/i, label: "to conclude"},
  {re: /\bfirst and foremost\b/i, label: "first and foremost"},
  {re: /\bin today'?s (?:fast-paced|modern|increasingly|ever-changing)\b/i, label: "in today's [modern/fast-paced] ..."},
  {re: /\bdelve(?:s|d|ing)?\s+into\b/i, label: "delve into"},
  {re: /\btapestry of\b/i, label: "tapestry of"},
  {re: /\bin the realm of\b/i, label: "in the realm of"},
  {re: /\bnavigat(?:e|es|ing) the (?:complexities|challenges|landscape)\b/i, label: "navigate the complexities"},
  {re: /\bunderscores? the (?:importance|need|significance)\b/i, label: "underscores the importance"},
  {re: /\bplays? a (?:crucial|vital|pivotal|key|significant) role in\b/ig, label: "plays a crucial role in (overused)", threshold: 2},
  {re: /\bmoreover\b/ig, label: "moreover (overused)", threshold: 3},
  {re: /\bfurthermore\b/ig, label: "furthermore (overused)", threshold: 3},
];

function detectAITells(text) {
  const hits = [];
  for (const {re, label, threshold} of AI_TELL_PATTERNS) {
    if (threshold) {
      const matches = String(text).match(re);
      if (matches && matches.length >= threshold) hits.push(`${label} ×${matches.length}`);
    } else {
      const m = String(text).match(re);
      if (m) hits.push(label);
    }
  }
  return hits;
}

function normalizeReadingMarkText(text) {
  return String(text||"").trim().replace(/\s+/g," ").toLowerCase();
}

function readingMarkMatchesSelection(selectionText, markText) {
  const selected = normalizeReadingMarkText(selectionText);
  const mark = normalizeReadingMarkText(markText);
  return !!selected && !!mark && (selected === mark || selected.includes(mark) || mark.includes(selected));
}

function addReadingHighlights(text, marks, onMarkClick) {
  const terms = (marks||[])
    .map(m=>typeof m === "string" ? {text:m,type:"highlight"} : m)
    .map(m=>({...m,text:String(m?.text||"").trim()}))
    .filter(m=>m.text.length >= 3)
    .slice(-18);
  if (!terms.length) return text;
  let parts = [{text,mark:false}];
  terms.forEach(term=>{
    const lowerTerm = term.text.toLowerCase();
    parts = parts.flatMap(part=>{
      if (part.mark) return [part];
      const lower = part.text.toLowerCase();
      const out = [];
      let pos = 0, idx = lower.indexOf(lowerTerm);
      while (idx >= 0) {
        if (idx > pos) out.push({text:part.text.slice(pos,idx),mark:false});
        out.push({text:part.text.slice(idx,idx+term.text.length),mark:true,type:term.type||"highlight",note:term.note||"",id:term.id||"",sectionId:term.sectionId||"",sourceText:term.text});
        pos = idx + term.text.length;
        idx = lower.indexOf(lowerTerm,pos);
      }
      if (pos < part.text.length) out.push({text:part.text.slice(pos),mark:false});
      return out.length ? out : [part];
    });
  });
  return parts.map((p,i)=>{
    if (!p.mark) return <React.Fragment key={i}>{p.text}</React.Fragment>;
    const interactive = !!onMarkClick;
    const openMark = (e) => {
      if (!interactive) return;
      e.preventDefault();
      e.stopPropagation();
      onMarkClick(p,e);
    };
    return <mark
      key={i}
      className={`reading-mark ${p.type==="note"?"reading-note-mark":"reading-highlight-mark"}`}
      title={p.note||""}
      role={interactive?"button":undefined}
      tabIndex={interactive?0:undefined}
      onClick={openMark}
      onKeyDown={interactive?(e)=>{ if (e.key==="Enter"||e.key===" ") openMark(e); }:undefined}
    >{p.text}</mark>;
  });
}

function readingQuestionGroups(questions) {
  const groups = [];
  (questions||[]).forEach(q=>{
    const key = q.group || q.type || "reading";
    const last = groups[groups.length-1];
    if (!last || last.key !== key) groups.push({key,type:q.type,label:q.group || readingTypeLabel(q.type),questions:[q]});
    else last.questions.push(q);
  });
  return groups;
}

function readingOptionParts(option) {
  const text = String(option||"").trim();
  const value = readingChoiceValue(text);
  const m = text.match(/^([A-Z]|[ivxlcdm]+)\s*[\.\)]\s*(.*)$/i);
  return {value, label:m ? (m[2] || text) : text, raw:text};
}

function ReadingSegmentedAnswer({options,value,onChange,disabled,variant=""}) {
  return <div className={`reading-segmented ${variant}`}>
    {options.map(opt=>{
      const selected = String(value||"") === String(opt);
      return <button type="button" key={opt} data-answer-value={opt} className={selected?"selected":""} disabled={disabled} onClick={()=>onChange(opt)}>{opt}</button>;
    })}
  </div>;
}

function ReadingOptionCards({options,value,onChange,disabled,mode="radio"}) {
  const values = mode==="checkbox" ? (Array.isArray(value) ? value : splitReadingAnswerList(value)) : [];
  return <div className={`reading-option-cards ${mode}`}>
    {(options||[]).map(opt=>{
      const p = readingOptionParts(opt);
      const selected = mode==="checkbox" ? values.includes(p.value) : String(value||"") === String(p.value);
      return <button type="button" key={p.raw} data-answer-value={p.value} className={`reading-choice-card ${selected?"selected":""}`} disabled={disabled} onClick={()=>{
        if (mode==="checkbox") onChange(selected ? values.filter(x=>x!==p.value) : [...values,p.value]);
        else onChange(p.value);
      }}>
        <span className="reading-choice-key">{p.value}</span>
        <span className="reading-choice-text">{p.label}</span>
      </button>;
    })}
  </div>;
}

function ReadingHeadingPicker({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-heading-picker">
    {options.map(opt=>{
      const p = readingOptionParts(opt);
      const selected = String(value||"") === String(p.value);
      return <button type="button" key={p.raw} data-answer-value={p.value} className={selected?"selected":""} disabled={disabled} onClick={()=>onChange(p.value)}>
        <span>{p.value}</span>
        <strong>{p.label}</strong>
      </button>;
    })}
  </div>;
}

function ReadingSelectAnswer({options,value,onChange,disabled,placeholder="Choose"}) {
  return <select className="reading-answer-select" value={String(value||"")} disabled={disabled} onChange={e=>onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(opt=>{
      const p = readingOptionParts(opt);
      return <option key={p.raw} value={p.value}>{p.raw}</option>;
    })}
  </select>;
}

function ReadingLetterPicker({options,value,onChange,disabled,variant=""}) {
  return <div className={`reading-letter-picker ${variant}`}>
    {(options||[]).map(opt=>{
      const p = readingOptionParts(opt);
      const selected = String(value||"") === String(p.value);
      return <button
        type="button"
        key={p.raw}
        className={selected?"selected":""}
        title={p.raw}
        aria-label={p.raw}
        disabled={disabled}
        onClick={()=>onChange(p.value)}
      >{p.value}</button>;
    })}
  </div>;
}

function ReadingMatchingHeadingAnswer({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-matching-row heading">
    <div className="reading-match-stem">{question.prompt}</div>
    <ReadingSelectAnswer options={options} value={value} onChange={onChange} disabled={disabled} placeholder="Heading"/>
  </div>;
}

function ReadingMatchingInfoAnswer({question,section,value,onChange,disabled}) {
  const options = readingSelectOptions(question, section);
  return <div className="reading-matching-row info">
    <div className="reading-match-label">Paragraph</div>
    <ReadingLetterPicker options={options} value={value} onChange={onChange} disabled={disabled} variant="paragraphs"/>
  </div>;
}

function ReadingMatchingFeatureAnswer({question,section,value,onChange,disabled}) {
  return <ReadingLetterPicker options={readingSelectOptions(question, section)} value={value} onChange={onChange} disabled={disabled} variant="features"/>;
}

function ReadingMatchingEndingAnswer({question,section,value,onChange,disabled}) {
  return <div className="reading-ending-answer">
    <div className="reading-ending-stem">{question.prompt}</div>
    <ReadingLetterPicker options={readingSelectOptions(question, section)} value={value} onChange={onChange} disabled={disabled} variant="endings"/>
  </div>;
}

function ReadingCompletionInput({question,value,onChange,disabled}) {
  const wordLimit = readingWordLimit(question);
  const placeholder = wordLimit ? `${wordLimit} word${wordLimit>1?"s":""} max` : "answer";
  return <input className="reading-answer-input" type="text" value={String(value||"")} onChange={e=>onChange(e.target.value)} disabled={disabled} placeholder={placeholder}/>;
}

function ReadingInlineCompletion({question,value,onChange,disabled}) {
  const parts = String(question.prompt||"").split(/_{2,}|\[[^\]]*\]/);
  if (parts.length < 2) return <div className="reading-completion-line"><span>{question.prompt}</span><ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/></div>;
  return <div className="reading-completion-line">
    <span>{parts[0]}</span>
    <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
    <span>{parts.slice(1).join(" ")}</span>
  </div>;
}

function ReadingCompletionFrame({question,value,onChange,disabled,kind}) {
  const label = {
    summary_completion:"Summary",
    note_completion:"Notes",
    table_completion:"Table",
    flow_chart_completion:"Flow chart",
    diagram_label_completion:"Diagram label"
  }[kind] || "Completion";
  return <div className={`reading-completion-frame ${kind}`}>
    <div className="reading-completion-title">{label}</div>
    <div className="reading-completion-content">
      <span>{question.prompt}</span>
      <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
    </div>
  </div>;
}

function ReadingShortAnswer({question,value,onChange,disabled}) {
  return <div className="reading-short-answer">
    <div className="reading-short-label">Answer</div>
    <ReadingCompletionInput question={question} value={value} onChange={onChange} disabled={disabled}/>
  </div>;
}

function ReadingAnswerControl({question,section,value,onChange,submitted}) {
  const disabled = !!submitted;
  const type = question.type;
  if (type === "true_false_not_given") return <ReadingSegmentedAnswer options={["TRUE","FALSE","NOT GIVEN"]} value={value} onChange={onChange} disabled={disabled} variant="tfng"/>;
  if (type === "yes_no_not_given") return <ReadingSegmentedAnswer options={["YES","NO","NOT GIVEN"]} value={value} onChange={onChange} disabled={disabled} variant="ynng"/>;
  if (type === "matching_information") return <ReadingMatchingInfoAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_headings") return <ReadingMatchingHeadingAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_features") return <ReadingMatchingFeatureAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "matching_sentence_endings") return <ReadingMatchingEndingAnswer question={question} section={section} value={value} onChange={onChange} disabled={disabled}/>;
  if (type === "multiple_choice") return <ReadingOptionCards options={question.options||[]} value={value} onChange={onChange} disabled={disabled} mode="radio"/>;
  if (type === "multiple_choice_multiple") return <ReadingOptionCards options={question.options||[]} value={value} onChange={onChange} disabled={disabled} mode="checkbox"/>;
  if (type === "sentence_completion") return <ReadingInlineCompletion question={question} value={value} onChange={onChange} disabled={disabled}/>;
  if (["summary_completion","note_completion","table_completion","flow_chart_completion","diagram_label_completion"].includes(type)) return <ReadingCompletionFrame question={question} value={value} onChange={onChange} disabled={disabled} kind={type}/>;
  if (type === "short_answer") return <ReadingShortAnswer question={question} value={value} onChange={onChange} disabled={disabled}/>;
  return <ReadingShortAnswer question={question} value={value} onChange={onChange} disabled={disabled}/>;
}

function ReadingQuestion({question,section,value,onChange,submitted,onToggleFlag,flagged}) {
  const correct = submitted && isReadingAnswerCorrect(question,value);
  const wrong = submitted && !correct;
  const type = question.type;
  const answerValue = value ?? (type==="multiple_choice_multiple" ? [] : "");
  const statusClass = submitted ? (correct ? "correct" : "wrong") : "";
  const promptInsideControl = ["matching_headings","matching_sentence_endings","sentence_completion","summary_completion","note_completion","table_completion","flow_chart_completion","diagram_label_completion"].includes(type);
  return <div id={`reading-q-${question.id}`} className={`reading-q ${statusClass} ${flagged?"flagged":""}`}>
    <div className="reading-q-num">{question.number}</div>
    <div className="reading-q-body">
      <div className="reading-q-top">
        <div className="reading-q-meta">
          <span>{readingTypeLabel(type)}</span>
          {question.paragraph&&<span>Paragraph {question.paragraph}</span>}
        </div>
        <div className="reading-q-actions">
          {submitted&&<span className={`reading-status ${correct?"ok":"bad"}`}>{correct?"correct":"review"}</span>}
          <button className={`reading-flag ${flagged?"active":""}`} onClick={()=>onToggleFlag(question.id)} disabled={submitted} title="Flag for review">{flagged?"Flagged":"Flag"}</button>
        </div>
      </div>
      {question.instruction&&<div className="reading-instruction">{question.instruction}</div>}
      {!promptInsideControl&&<div className="reading-prompt">{question.prompt}</div>}
      <ReadingAnswerControl question={question} section={section} value={answerValue} onChange={onChange} submitted={submitted}/>
      {submitted&&<div className="reading-feedback">
        <strong>Answer: {Array.isArray(question.answer)?question.answer.join(", "):question.answer}</strong>
        {question.explanation&&<span> - {question.explanation}</span>}
        {wrong&&question.trap&&<div className="reading-trap">Trap: {question.trap}</div>}
      </div>}
    </div>
  </div>;
}

function ReadingAnswerSheet({testData,answers,result,flags,activeSection,setActiveSection}) {
  if (!testData) return null;
  const answered = testData.questions.filter(q=>{
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
  }).length;
  const jump = (q) => {
    setActiveSection(q.sectionIndex);
    setTimeout(()=>document.getElementById(`reading-q-${q.id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),80);
  };
  return <div className="reading-sheet">
    <div className="reading-sheet-top">
      <span>Answer Sheet</span>
      <strong>{answered}/{testData.questions.length}</strong>
    </div>
    <div className="reading-sheet-grid">
      {testData.questions.map(q=>{
        const v = answers[q.id];
        const has = Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
        const d = result?.details?.find(x=>x.id===q.id);
        const classes = [
          "reading-sheet-btn",
          q.sectionIndex===activeSection ? "active" : "",
          has ? "answered" : "",
          flags[q.id] ? "flagged" : "",
          d ? (d.correct ? "correct" : "wrong") : ""
        ].filter(Boolean).join(" ");
        return <button key={q.id} onClick={()=>jump(q)} className={classes}>{q.number}</button>;
      })}
    </div>
  </div>;
}

function ReadingSelectionToolbar({selection,onHighlight,onUnhighlight,onNote,onClose}) {
  if (!selection) return null;
  return <div className="reading-selection-toolbar" style={{left:selection.x,top:selection.y}} onMouseDown={e=>e.preventDefault()}>
    {selection.canUnhighlight
      ? <button type="button" className="danger" onClick={onUnhighlight}>Unhighlight</button>
      : <button type="button" onClick={onHighlight}>Highlight</button>}
    <button type="button" onClick={onNote}>Note</button>
    <button type="button" className="icon" onClick={onClose}>x</button>
  </div>;
}

function ReadingMarkPopover({mark,onUnhighlight,onClose}) {
  if (!mark) return null;
  return <div className={`reading-mark-popover ${mark.type==="note"?"note":""}`} style={{left:mark.x,top:mark.y}} onMouseDown={e=>e.stopPropagation()}>
    <div className="reading-mark-popover-text">"{mark.text}"</div>
    {mark.type==="note"&&<p>{mark.note}</p>}
    <div className="reading-mark-popover-actions">
      {mark.type==="highlight"&&<button type="button" className="danger" onClick={onUnhighlight}>Unhighlight</button>}
      <button type="button" onClick={onClose}>Close</button>
    </div>
  </div>;
}

function ReadingPassage({section,highlights,notes,onSelection,onMarkClick,onClearHighlights}) {
  const snippets = highlights?.[section.id] || [];
  const sectionNotes = notes?.[section.id] || [];
  const marks = [
    ...sectionNotes.map(n=>({text:n.text,type:"note",note:n.note,id:n.id,sectionId:section.id})),
    ...snippets.map((s,i)=>typeof s === "string" ? {text:s,type:"highlight",id:`highlight-${i}`,sectionId:section.id} : {...s,type:s.type||"highlight",sectionId:section.id})
  ];
  return <div className="reading-passage-pane">
    <div className="reading-pane-head">
      <div>
        <div className="reading-pane-label">Passage {section.number}</div>
        <div className="reading-passage-title">{section.title}</div>
        <div className="reading-passage-source">{section.sourceNote}</div>
      </div>
      <div className="reading-pane-actions">
        {(snippets.length>0||sectionNotes.length>0)&&<button className="reading-tool-btn muted" onClick={onClearHighlights}>Clear marks</button>}
      </div>
    </div>
    <div className="reading-passage-body" onMouseUp={onSelection} onTouchEnd={onSelection}>
      {section.paragraphs.map((p,i)=><p key={i}>
        <strong>Paragraph {paragraphLetter(i)} </strong>
        {addReadingHighlights(p,marks,onMarkClick)}
      </p>)}
    </div>
    {section.vocabulary?.length>0&&<div className="reading-glossary">
      <div className="reading-bank-title">Glossary</div>
      <div className="reading-bank-items">{section.vocabulary.map((v,i)=><span key={i}>{v.word}: {v.meaning}</span>)}</div>
    </div>}
    {sectionNotes.length>0&&<div className="reading-notes-panel">
      <div className="reading-bank-title">Notes</div>
      {sectionNotes.map((n,i)=><div key={n.id||i} className="reading-note-item">
        <div>"{n.text}"</div>
        <p>{n.note}</p>
      </div>)}
    </div>}
  </div>;
}

function ReadingBank({title,items}) {
  if (!items?.length) return null;
  return <div className="reading-bank">
    <div className="reading-bank-title">{title}</div>
    <div className="reading-bank-list">{items.map((h,i)=><div key={i}>{h}</div>)}</div>
  </div>;
}

function ReadingQuestionOptionBank({group,section}) {
  const first = group.questions[0];
  let title = "";
  let items = [];
  if (group.type === "matching_sentence_endings") {
    title = "Ending Bank";
    items = first?.options || [];
  } else if (group.type === "matching_headings" && !(section?.headings||[]).length) {
    title = "Heading Bank";
    items = readingSelectOptions(first, section);
  } else if (group.type === "matching_features" && !(section?.features||[]).length) {
    title = "Feature Bank";
    items = readingSelectOptions(first, section);
  }
  if (!items.length) return null;
  return <div className={`reading-q-option-bank ${group.type}`}>
    <div className="reading-bank-title">{title}</div>
    <div className="reading-q-option-list">
      {items.map(opt=>{
        const p = readingOptionParts(opt);
        return <div key={p.raw} className="reading-q-option-item">
          <span>{p.value}</span>
          <strong>{p.label}</strong>
        </div>;
      })}
    </div>
  </div>;
}

function ReadingQuestionGroup({group,section,answers,result,flags,setAnswers,toggleFlag}) {
  const first = group.questions[0]?.number;
  const last = group.questions[group.questions.length-1]?.number;
  return <section className="reading-q-group">
    <div className="reading-q-group-head">
      <span>{group.label}</span>
      <strong>Questions {first}{first!==last?`-${last}`:""}</strong>
    </div>
    <ReadingQuestionOptionBank group={group} section={section}/>
    {group.questions.map(q=><ReadingQuestion key={q.id} question={q} section={section} value={answers[q.id]} submitted={!!result} onChange={v=>setAnswers(a=>({...a,[q.id]:v}))} flagged={!!flags[q.id]} onToggleFlag={toggleFlag}/>)}
  </section>;
}

function readingResultStats(details) {
  const byType = {};
  const bySkill = {};
  details.forEach(d=>{
    const type = d.type || "unknown";
    const skill = d.skill || "Reading detail";
    if (!byType[type]) byType[type] = {correct:0,total:0};
    if (!bySkill[skill]) bySkill[skill] = {correct:0,total:0};
    byType[type].total += 1;
    bySkill[skill].total += 1;
    if (d.correct) { byType[type].correct += 1; bySkill[skill].correct += 1; }
  });
  const weakTypes = Object.entries(byType).map(([k,v])=>({key:k,...v,rate:v.correct/v.total})).sort((a,b)=>a.rate-b.rate).slice(0,4);
  const weakSkills = Object.entries(bySkill).map(([k,v])=>({key:k,...v,rate:v.correct/v.total})).sort((a,b)=>a.rate-b.rate).slice(0,4);
  return {byType,bySkill,weakTypes,weakSkills};
}

function ReadingReviewPanel({result}) {
  if (!result) return null;
  const stats = readingResultStats(result.details || []);
  const wrong = (result.details||[]).filter(d=>!d.correct);
  const overTime = result.elapsedSeconds > (result.durationSeconds || 3600);
  return <div className="fu">
    <div className="card" style={{borderLeft:"2px solid var(--leaf)"}}>
      <div style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap"}}>
        <div className="overall-big" style={{color:bandColor(result.band)}}>{result.score}/{result.total}</div>
        <div>
          <div className="sl">Estimated Academic Reading Band</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:30,color:bandColor(result.band),lineHeight:1.1}}>{result.band.toFixed(1)}</div>
          <div style={{fontSize:12,color:"var(--ink3)",lineHeight:1.5,marginTop:4}}>Time used {formatReadingTime(result.elapsedSeconds)}{overTime?" - over target time":""}</div>
        </div>
      </div>
    </div>
    <div className="cols-2">
      <div className="insight-box fix">
        <div className="insight-h" style={{color:"var(--orchid)"}}>Weakest Question Types</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{stats.weakTypes.map(x=><span key={x.key} className="sublist-btn" style={{cursor:"default"}}>{readingTypeLabel(x.key)} {x.correct}/{x.total}</span>)}</div>
      </div>
      <div className="insight-box win">
        <div className="insight-h" style={{color:"var(--leaf)"}}>Reading Skills</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{stats.weakSkills.map(x=><span key={x.key} className="sublist-btn" style={{cursor:"default"}}>{x.key} {x.correct}/{x.total}</span>)}</div>
      </div>
    </div>
    {wrong.length>0&&<div className="card">
      <div className="card-h"><div className="cdot" style={{background:"var(--rose)"}}/>Review Missed Questions</div>
      <div style={{display:"grid",gap:8}}>
        {wrong.slice(0,12).map(d=><div key={d.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 11px"}}>
          <div style={{fontFamily:"'Geist Mono',monospace",fontSize:10,color:"var(--rose)",marginBottom:4}}>Q{d.number} - {readingTypeLabel(d.type)}</div>
          <div style={{fontSize:12.5,color:"var(--ink2)",lineHeight:1.5,marginBottom:5}}>{d.prompt}</div>
          <div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5}}>Your answer: <span style={{color:"var(--honey)"}}>{Array.isArray(d.userAnswer)?d.userAnswer.join(", "):(d.userAnswer||"(blank)")}</span> - Correct: <span style={{color:"var(--leaf)"}}>{Array.isArray(d.answer)?d.answer.join(", "):d.answer}</span></div>
          {d.explanation&&<div style={{fontSize:11.5,color:"var(--ink3)",lineHeight:1.5,marginTop:4}}>{d.explanation}</div>}
        </div>)}
      </div>
    </div>}
  </div>;
}

function ReadingPage({state,setState,config}) {
  const savedDraft = state.readingDraft || {};
  const [tab,setTab] = useState(()=>savedDraft.tab || "generate");
  const [practiceMode,setPracticeMode] = useState(()=>savedDraft.practiceMode || "mini");
  const [topic,setTopic] = useState(()=>savedDraft.topic || "science and technology");
  const [difficulty,setDifficulty] = useState(()=>savedDraft.difficulty || "7.0");
  const [focusType,setFocusType] = useState(()=>savedDraft.focusType || "mixed");
  const [questionCount,setQuestionCount] = useState(()=>savedDraft.questionCount || 8);
  const [testData,setTestData] = useState(()=>savedDraft.testData || null);
  const [answers,setAnswers] = useState(()=>savedDraft.answers || {});
  const [result,setResult] = useState(()=>savedDraft.result || null);
  const [genLoading,setGenLoading] = useState(false);
  const [genStatus,setGenStatus] = useState("");
  const [wikiSubject,setWikiSubject] = useState(()=>savedDraft.wikiSubject || "");
  const [readingDataset,setReadingDataset] = useState(()=>state.readingDataset||[]);
  const [datasetFilter,setDatasetFilter] = useState("all");
  const [seedTitle,setSeedTitle] = useState("");
  const [seedTopic,setSeedTopic] = useState("");
  const [seedDifficulty,setSeedDifficulty] = useState("7.0");
  const [seedParagraphs,setSeedParagraphs] = useState("");
  const [timerRunning,setTimerRunning] = useState(()=>!!savedDraft.timerRunning);
  const [elapsed,setElapsed] = useState(()=>savedDraft.elapsed || 0);
  const [timerStartedAt,setTimerStartedAt] = useState(()=>savedDraft.timerStartedAt || null);
  const [timerBase,setTimerBase] = useState(()=>savedDraft.timerBase || 0);
  const [activeSection,setActiveSection] = useState(()=>savedDraft.activeSection || 0);
  const [flags,setFlags] = useState(()=>savedDraft.flags || {});
  const [highlights,setHighlights] = useState(()=>savedDraft.highlights || {});
  const [readingNotes,setReadingNotes] = useState(()=>savedDraft.readingNotes || {});
  const [selectionToolbar,setSelectionToolbar] = useState(null);
  const [activeMark,setActiveMark] = useState(null);
  const [readingTheme,setReadingTheme] = useState(()=>savedDraft.readingTheme || "light");
  const archive = state.readingTests || [];

  useEffect(()=>{ setState(s=>({...s,readingDataset})); },[readingDataset]);

  const addToDataset = (entries) => {
    const list = Array.isArray(entries) ? entries : [entries];
    const valid = list.filter(Boolean);
    if (valid.length === 0) return;
    setReadingDataset(prev=>{
      const existingIds = new Set(prev.map(e=>e.id));
      return [...prev, ...valid.filter(e=>!existingIds.has(e.id))];
    });
  };

  const handleLibraryImport = async (e) => {
    const files = Array.from(e.target.files||[]);
    e.target.value = "";
    const newEntries = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const toolJson = JSON.parse(text);
        // Support both tool format and exported dataset format
        if (Array.isArray(toolJson)) {
          // Exported dataset bundle
          for (const entry of toolJson) {
            if (entry?.testData?.sections?.[0]) newEntries.push({...entry, source: entry.source||"imported"});
          }
        } else if (toolJson?.testData?.sections) {
          // Single exported entry
          newEntries.push({...toolJson, source: toolJson.source||"imported"});
        } else {
          // Python tool format
          const converted = convertToolPassageToApp(toolJson);
          const entry = buildDatasetEntryFromTest(converted, "imported", 0);
          if (entry) {
            entry.id = toolJson.id || entry.id;
            entry.wordCount = toolJson.passage?.word_count || entry.wordCount;
            entry.topicTags = toolJson.passage?.topic_tags || [];
            newEntries.push(entry);
          }
        }
      } catch(err) { alert(`Failed to import ${file.name}: ${err.message}`); }
    }
    addToDataset(newEntries);
  };

  const loadDatasetEntry = (entry) => {
    const normalized = normalizeReadingTest(entry.testData, entry.topic, entry.level, "mixed", "section");
    normalized.qualityWarnings = [];
    loadTest(normalized);
  };

  const removeDatasetEntry = (id) => {
    if (!window.confirm("Remove this passage from the dataset?")) return;
    setReadingDataset(prev=>prev.filter(e=>e.id!==id));
  };

  const toggleFewShot = (id) => {
    setReadingDataset(prev=>prev.map(e=>e.id===id?{...e,useAsFewShot:e.useAsFewShot===false}:e));
  };

  const exportDataset = () => {
    if (readingDataset.length === 0) { alert("Dataset is empty."); return; }
    const blob = new Blob([JSON.stringify(readingDataset, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ielts-reading-dataset-${TODAY()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearDataset = () => {
    if (!window.confirm(`Remove all ${readingDataset.length} dataset entries? This cannot be undone.`)) return;
    setReadingDataset([]);
  };

  const addSeedPassage = () => {
    const title = seedTitle.trim();
    const paraText = seedParagraphs.trim();
    if (!title || !paraText) { alert("Title and paragraphs are required."); return; }
    const paragraphs = paraText.split(/\n\s*\n+/).map(p=>p.trim()).filter(Boolean);
    if (paragraphs.length < 3) { alert("Please paste at least 3 paragraphs separated by blank lines."); return; }
    const topic = seedTopic.trim();
    const level = `Band ${seedDifficulty}`;
    const wordCount = paragraphs.reduce((sum,p)=>sum+p.split(/\s+/).filter(Boolean).length, 0);
    const entry = {
      id: `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,
      source: "seed",
      title,
      topic,
      topicTags: topic ? topic.split(/[,;]/).map(s=>s.trim()).filter(Boolean) : [],
      level,
      section: sectionFromBand(level),
      questionCount: 0,
      wordCount,
      paragraphLabels: paragraphs.map((_,i)=>String.fromCharCode(65+i)),
      testData: {
        mode: "section",
        title,
        durationSeconds: 1200,
        sourcePolicy: "User-added reference passage",
        sections: [{
          id: "section-1",
          passage: {title,topic,level,sourceNote:"User-added reference passage",paragraphs,topic_tags:[]},
          headings: [],
          features: [],
          questions: [],
          vocabulary: []
        }]
      },
      useAsFewShot: true,
      createdAt: new Date().toISOString()
    };
    addToDataset(entry);
    setSeedTitle(""); setSeedTopic(""); setSeedParagraphs("");
    alert("Reference passage added to dataset. It will be used as a style anchor in future generations.");
  };

  const filteredDataset = readingDataset.filter(e => {
    if (datasetFilter === "all") return true;
    if (datasetFilter === "generated") return e.source === "generated";
    if (datasetFilter === "imported") return e.source === "imported";
    if (datasetFilter === "seed") return e.source === "seed";
    if (datasetFilter === "fewshot") return e.useAsFewShot !== false;
    return true;
  });
  const fewShotCount = readingDataset.filter(e => e.useAsFewShot !== false).length;

  useEffect(()=>{
    setState(s=>({
      ...s,
      readingDraft:{tab,practiceMode,topic,difficulty,focusType,questionCount,wikiSubject,testData,answers,result,timerRunning,elapsed,timerStartedAt,timerBase,activeSection,flags,highlights,readingNotes,readingTheme,updatedAt:new Date().toISOString()}
    }));
  },[tab,practiceMode,topic,difficulty,focusType,questionCount,wikiSubject,testData,answers,result,timerRunning,elapsed,timerStartedAt,timerBase,activeSection,flags,highlights,readingNotes,readingTheme]);

  useEffect(()=>{
    if (!timerRunning || !timerStartedAt) return;
    const tick = () => setElapsed(timerBase + Math.floor((Date.now()-timerStartedAt)/1000));
    tick();
    const id = setInterval(tick,1000);
    return ()=>clearInterval(id);
  },[timerRunning,timerStartedAt,timerBase]);

  useEffect(()=>{
    if (!selectionToolbar && !activeMark) return;
    const closeFloatingUi = (e) => {
      if (e.target?.closest?.(".reading-selection-toolbar,.reading-mark-popover")) return;
      setSelectionToolbar(null);
      setActiveMark(null);
    };
    const closeOnEscape = (e) => {
      if (e.key === "Escape") {
        setSelectionToolbar(null);
        setActiveMark(null);
      }
    };
    document.addEventListener("mousedown", closeFloatingUi);
    document.addEventListener("touchstart", closeFloatingUi);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeFloatingUi);
      document.removeEventListener("touchstart", closeFloatingUi);
      document.removeEventListener("keydown", closeOnEscape);
    };
  },[selectionToolbar,activeMark]);

  const getRunningElapsed = () => timerRunning && timerStartedAt
    ? timerBase + Math.floor((Date.now()-timerStartedAt)/1000)
    : elapsed;

  const expectedQuestions = practiceMode === "full" ? 40 : practiceMode === "section" ? 13 : questionCount;
  const currentSection = testData?.sections?.[activeSection] || testData?.sections?.[0] || null;
  const duration = testData?.durationSeconds || READING_MODE_META[practiceMode]?.duration || 900;
  const remaining = Math.max(0,duration-elapsed);
  const answeredCount = testData ? testData.questions.filter(q=>{
    const v = answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!String(v||"").trim();
  }).length : 0;

  const startReadingTimer = (seconds=0) => {
    setTimerBase(seconds);
    setElapsed(seconds);
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const pauseReadingTimer = () => {
    const next = getRunningElapsed();
    setElapsed(next);
    setTimerBase(next);
    setTimerStartedAt(null);
    setTimerRunning(false);
  };

  const resumeReadingTimer = () => {
    setTimerBase(elapsed);
    setTimerStartedAt(Date.now());
    setTimerRunning(true);
  };

  const loadTest = (data) => {
    const normalized = normalizeReadingTest(data, topic, `Band ${difficulty}`, focusType, data.mode || practiceMode);
    setTestData(normalized);
    setAnswers({});
    setResult(null);
    setFlags({});
    setHighlights({});
    setReadingNotes({});
    setSelectionToolbar(null);
    setActiveMark(null);
    setActiveSection(0);
    setTab("test");
    startReadingTimer(0);
  };

  const generateReadingTest = async () => {
    if (!config) { alert("Set up your AI config in Settings first, or use the demo passage."); return; }
    setGenLoading(true);
    setGenStatus("Starting...");
    try {
      if (practiceMode === "full") {
        await generateFullTest();
      } else {
        await generateSinglePassageTest();
      }
    } catch(e) { alert("Reading generation error: "+e.message); }
    finally { setGenLoading(false); setGenStatus(""); }
  };

  const runPassageGeneration = async (topicForGen, sectionDiff, bandForGen, fewShot, sourceText, statusPrefix) => {
    let corrective = "";
    let passageData = null;
    for (let attempt = 0; attempt <= 1; attempt++) {
      const stepLabel = attempt === 0 ? "Generating passage" : "Retrying passage (AI-tell detected)";
      const refNote = fewShot.length > 0 ? ` · ${fewShot.length} reference` : "";
      const srcNote = sourceText ? ` · Wikipedia-grounded` : "";
      setGenStatus(`${statusPrefix||""}${stepLabel}${refNote}${srcNote}...`);
      const passagePrompt = buildPassagePrompt(topicForGen, sectionDiff, bandForGen, fewShot, sourceText, corrective);
      const passageRaw = await callAPI(config, [{role:"system",content:passagePrompt.system},{role:"user",content:passagePrompt.user}], passagePrompt.maxTokens);
      passageData = safeJSON(passageRaw);
      const fullText = (passageData.paragraphs||[]).map(p=>p.text||"").join(" ");
      const tells = detectAITells(fullText);
      if (tells.length === 0 || attempt === 1) {
        if (tells.length > 0) console.warn("[reading] AI-tells remain after retry:", tells);
        return passageData;
      }
      corrective = `Your previous draft used AI-tell phrases (${tells.join("; ")}). Rewrite from scratch WITHOUT any of those phrases. Use natural Cambridge-style transitions instead.`;
    }
    return passageData;
  };

  const generateSinglePassageTest = async () => {
    const sectionDiff = parseFloat(difficulty) >= 8.0 ? 3 : parseFloat(difficulty) >= 7.0 ? 2 : 1;
    const fewShot = pickFewShotExamples(readingDataset, topic, sectionDiff, 1);
    let sourceText = "";
    let wikiTitle = "";
    if (wikiSubject.trim()) {
      try {
        setGenStatus(`Fetching Wikipedia source for "${wikiSubject.trim()}"...`);
        const src = await fetchWikipediaSource(wikiSubject.trim());
        sourceText = src.text;
        wikiTitle = src.title;
      } catch(e) {
        if (!window.confirm(`${e.message}\n\nContinue without Wikipedia source?`)) throw new Error("Cancelled by user.");
      }
    }
    const passageData = await runPassageGeneration(topic, sectionDiff, difficulty, fewShot, sourceText, "");
    const paragraphs = passageData.paragraphs || [];
    if (paragraphs.length < 4) throw new Error("Passage generation returned too few paragraphs. Try again.");
    const passageWithLabels = formatWithLabels(paragraphs);
    const paragraphLabels = paragraphs.map(p => p.label);
    const questionMix = getReadingQuestionMix(practiceMode, focusType, questionCount, paragraphLabels, sectionDiff);
    let allQuestions = [];
    for (let qi = 0; qi < questionMix.length; qi++) {
      const qGroup = questionMix[qi];
      setGenStatus(`Generating ${qGroup.label} questions... (${qi+2}/${questionMix.length+1})`);
      const built = buildAndConvertQuestions(qGroup, passageWithLabels);
      if (!built) continue;
      const qRaw = await callAPI(config, [{role:"system",content:built.prompt.system},{role:"user",content:built.prompt.user}], built.prompt.maxTokens);
      const qData = safeJSON(qRaw);
      allQuestions = [...allQuestions, ...built.convert(qData)];
    }
    const test = {
      mode: practiceMode,
      title: passageData.title || `Academic Reading: ${topic}`,
      durationSeconds: READING_MODE_META[practiceMode].duration,
      sourcePolicy: READING_SOURCE_POLICY,
      sections: [{
        id: "section-1",
        passage: {title:passageData.title||"",topic,level:`Band ${difficulty}`,sourceNote:READING_SOURCE_POLICY,paragraphs:paragraphs.map(p=>p.text),topic_tags:passageData.topic_tags||[]},
        headings: extractHeadingOptions(allQuestions),
        features: [],
        questions: allQuestions,
        vocabulary: []
      }]
    };
    let normalized = normalizeReadingTest(test, topic, `Band ${difficulty}`, focusType, practiceMode);
    const warnings = validateReadingTest(normalized, expectedQuestions);
    normalized.qualityWarnings = warnings;
    if (normalized.questions.length < Math.min(4, expectedQuestions)) throw new Error("Generated reading set is incomplete.");
    // Save to dataset for future few-shot use
    const entry = buildDatasetEntryFromTest(test, "generated", 0);
    if (entry) { entry.topicTags = passageData.topic_tags || []; entry.wordCount = passageData.word_count || entry.wordCount; addToDataset(entry); }
    loadTest(normalized);
  };

  const generateFullTest = async () => {
    const sections = [];
    const passageMeta = [];
    for (let si = 0; si < 3; si++) {
      const sectionNum = si + 1;
      const topicForSection = READING_TOPICS[Math.floor(Math.random() * READING_TOPICS.length)];
      const bandForSection = si === 0 ? "6.5" : si === 1 ? "7.0" : "7.5";
      const fewShot = pickFewShotExamples(readingDataset, topicForSection, sectionNum, 1);
      const passageData = await runPassageGeneration(topicForSection, sectionNum, bandForSection, fewShot, "", `Passage ${sectionNum}/3 (${topicForSection}) · `);
      const paragraphs = passageData.paragraphs || [];
      if (paragraphs.length < 4) throw new Error(`Passage ${sectionNum} generation returned too few paragraphs.`);
      const passageWithLabels = formatWithLabels(paragraphs);
      const paragraphLabels = paragraphs.map(p => p.label);
      const questionMix = getReadingQuestionMix("full", "mixed", 13, paragraphLabels, sectionNum);
      let sectionQuestions = [];
      for (let qi = 0; qi < questionMix.length; qi++) {
        const qGroup = questionMix[qi];
        setGenStatus(`Passage ${sectionNum}/3: ${qGroup.label}...`);
        const built = buildAndConvertQuestions(qGroup, passageWithLabels);
        if (!built) continue;
        const qRaw = await callAPI(config, [{role:"system",content:built.prompt.system},{role:"user",content:built.prompt.user}], built.prompt.maxTokens);
        const qData = safeJSON(qRaw);
        sectionQuestions = [...sectionQuestions, ...built.convert(qData)];
      }
      sections.push({
        id: `section-${sectionNum}`,
        passage: {title:passageData.title||`Passage ${sectionNum}`,topic:topicForSection,level:`Band ${bandForSection}`,sourceNote:READING_SOURCE_POLICY,paragraphs:paragraphs.map(p=>p.text),topic_tags:passageData.topic_tags||[]},
        headings: extractHeadingOptions(sectionQuestions),
        features: [],
        questions: sectionQuestions,
        vocabulary: []
      });
      passageMeta.push({topicTags: passageData.topic_tags || [], wordCount: passageData.word_count || 0});
    }
    const test = {mode:"full",title:"Full IELTS Academic Reading Test",durationSeconds:3600,sourcePolicy:READING_SOURCE_POLICY,sections};
    let normalized = normalizeReadingTest(test, topic, `Band ${difficulty}`, "mixed", "full");
    const warnings = validateReadingTest(normalized, 40);
    normalized.qualityWarnings = warnings;
    if (normalized.questions.length < 20) throw new Error("Full test generation incomplete — fewer than 20 questions generated.");
    // Save each passage to dataset
    const newEntries = sections.map((_, idx) => {
      const entry = buildDatasetEntryFromTest(test, "generated", idx);
      if (entry && passageMeta[idx]) { entry.topicTags = passageMeta[idx].topicTags; if (passageMeta[idx].wordCount) entry.wordCount = passageMeta[idx].wordCount; }
      return entry;
    });
    addToDataset(newEntries);
    loadTest(normalized);
  };

  const submitAnswers = () => {
    if (!testData) return;
    const elapsedForResult = getRunningElapsed();
    setTimerRunning(false);
    setTimerStartedAt(null);
    setTimerBase(elapsedForResult);
    setElapsed(elapsedForResult);
    const details = testData.questions.map(q=>{
      const section = testData.sections[q.sectionIndex] || {};
      return {
        id:q.id,
        number:q.number,
        sectionNumber:(q.sectionIndex||0)+1,
        sectionTitle:section.title,
        type:q.type,
        prompt:q.prompt,
        answer:q.answer,
        acceptedAnswers:q.acceptedAnswers,
        userAnswer:answers[q.id] || "",
        correct:isReadingAnswerCorrect(q, answers[q.id]),
        explanation:q.explanation,
        skill:q.skill,
        paragraph:q.paragraph,
        anchor:q.anchor,
        trap:q.trap
      };
    });
    const score = details.filter(d=>d.correct).length;
    const total = details.length;
    const summary = {
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      date:TODAY(),
      savedAt:new Date().toISOString(),
      mode:testData.mode,
      title:testData.title,
      topic:testData.topic,
      focusType,
      sourcePolicy:testData.sourcePolicy || READING_SOURCE_POLICY,
      score,
      total,
      band:readingEstimatedBand(score,total),
      elapsedSeconds:elapsedForResult,
      durationSeconds:testData.durationSeconds,
      sections:testData.sections,
      questions:testData.questions,
      answers,
      details,
      flags,
      highlights,
      readingNotes,
      readingTheme,
      qualityWarnings:testData.qualityWarnings || []
    };
    setResult(summary);
    setState(s=>({...s, readingTests:[summary,...(s.readingTests||[])]}));
  };

  const loadArchive = (entry) => {
    const restored = normalizeReadingTest(entry, entry.topic || "Reading", entry.level || "Band 7.0", entry.focusType || "mixed", entry.mode || "mini");
    restored.qualityWarnings = entry.qualityWarnings || [];
    setTestData(restored);
    setAnswers(entry.answers || {});
    setResult(entry);
    setFlags(entry.flags || {});
    setHighlights(entry.highlights || {});
    setReadingNotes(entry.readingNotes || {});
    setSelectionToolbar(null);
    setActiveMark(null);
    setReadingTheme(entry.readingTheme || "light");
    setElapsed(entry.elapsedSeconds || 0);
    setTimerBase(entry.elapsedSeconds || 0);
    setTimerStartedAt(null);
    setTimerRunning(false);
    setActiveSection(0);
    setTab("test");
  };

  const deleteArchive = (id) => {
    if (!window.confirm("Delete this Reading attempt?")) return;
    setState(s=>({...s, readingTests:(s.readingTests||[]).filter(x=>x.id!==id)}));
  };

  const resetCurrentTest = () => {
    if (testData && !result && !window.confirm("Clear the current unsaved Reading test?")) return;
    setTestData(null); setAnswers({}); setResult(null); setFlags({}); setHighlights({}); setReadingNotes({}); setSelectionToolbar(null); setActiveMark(null); setElapsed(0); setTimerBase(0); setTimerStartedAt(null); setTimerRunning(false); setTab("generate");
  };

  const toggleFlag = (id) => setFlags(f=>({...f,[id]:!f[id]}));

  const getSelectedReadingText = () => String(window.getSelection?.().toString() || "").trim().replace(/\s+/g," ");

  const handleReadingSelection = () => {
    if (!currentSection) return;
    setTimeout(()=>{
      const selected = getSelectedReadingText();
      if (!selected) { setSelectionToolbar(null); return; }
      const selection = window.getSelection?.();
      if (!selection || selection.rangeCount === 0) return;
      const pane = document.querySelector(".reading-passage-pane");
      if (pane && selection.anchorNode && !pane.contains(selection.anchorNode)) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect || (!rect.width && !rect.height)) return;
      setSelectionToolbar({
        sectionId:currentSection.id,
        text:selected.slice(0,180),
        canUnhighlight:(highlights[currentSection.id]||[]).some(h=>readingMarkMatchesSelection(selected,typeof h === "string" ? h : h.text)),
        x:Math.min(window.innerWidth-170,Math.max(12,rect.left+(rect.width/2)-78)),
        y:Math.max(12,rect.top-46)
      });
      setActiveMark(null);
    },0);
  };

  const addHighlightFromToolbar = () => {
    if (!selectionToolbar) return;
    setHighlights(h=>({
      ...h,
      [selectionToolbar.sectionId]:(h[selectionToolbar.sectionId]||[]).some(item=>readingMarkMatchesSelection(selectionToolbar.text,typeof item === "string" ? item : item.text))
        ? (h[selectionToolbar.sectionId]||[])
        : [...(h[selectionToolbar.sectionId]||[]),selectionToolbar.text]
    }));
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const removeHighlightText = (sectionId, text) => {
    if (!sectionId || !text) return;
    setHighlights(h=>({
      ...h,
      [sectionId]:(h[sectionId]||[]).filter(item=>!readingMarkMatchesSelection(text,typeof item === "string" ? item : item.text))
    }));
    setSelectionToolbar(null);
    setActiveMark(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const removeHighlightFromToolbar = () => {
    if (!selectionToolbar) return;
    removeHighlightText(selectionToolbar.sectionId, selectionToolbar.text);
  };

  const addNoteFromToolbar = () => {
    if (!selectionToolbar) return;
    const note = window.prompt("Add a note for this selection:");
    if (!note?.trim()) { setSelectionToolbar(null); return; }
    const item = {
      id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),
      text:selectionToolbar.text,
      note:note.trim(),
      createdAt:new Date().toISOString()
    };
    setReadingNotes(n=>({
      ...n,
      [selectionToolbar.sectionId]:[...(n[selectionToolbar.sectionId]||[]),item]
    }));
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const openReadingMarkPopover = (mark,e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMark({
      ...mark,
      text:mark.sourceText || mark.text,
      x:Math.min(window.innerWidth-240,Math.max(12,rect.left+(rect.width/2)-105)),
      y:Math.max(12,rect.top-62)
    });
    setSelectionToolbar(null);
    window.getSelection?.().removeAllRanges?.();
  };

  const average = archive.length ? archive.reduce((sum,x)=>sum+(x.score/(x.total||1)),0)/archive.length : 0;
  const typeStats = {};
  archive.forEach(a=>(a.details||[]).forEach(d=>{
    const key = d.type || "unknown";
    if (!typeStats[key]) typeStats[key] = {correct:0,total:0};
    typeStats[key].total += 1;
    if (d.correct) typeStats[key].correct += 1;
  }));

  return <div className={`canvas fu ${tab==="test"&&testData?"reading-canvas":""} ${readingTheme==="dark"?"reading-dark":""}`}>
    <div className="kicker">IELTS Academic - Reading</div>
    <h1 className="title-x">Reading <em>Lab</em></h1>
    <div className="mode-toggle">
      <button className={`mode-btn ${tab==="generate"?"active":""}`} onClick={()=>setTab("generate")}>Generate</button>
      <button className={`mode-btn ${tab==="test"?"active":""}`} onClick={()=>setTab("test")}>Test</button>
      <button className={`mode-btn ${tab==="dataset"?"active":""}`} onClick={()=>setTab("dataset")}>Dataset {readingDataset.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({readingDataset.length})</span>}</button>
      <button className={`mode-btn ${tab==="archive"?"active":""}`} onClick={()=>setTab("archive")}>Archive {archive.length>0&&<span style={{fontSize:10,opacity:.7,marginLeft:3}}>({archive.length})</span>}</button>
    </div>

    {tab==="generate"&&<div className="fu">
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Reading Source</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65}}>
          Multi-step pipeline: passage generated first with Cambridge-style style specs, then each question type generated separately with specialist item-writer prompts. Produces significantly more authentic T/F/NG, MCQ, and completion questions than single-shot generation.
        </div>
      </div>
      <div className="card">
        <div className="mode-toggle" style={{marginBottom:12}}>
          {Object.entries(READING_MODE_META).map(([id,m])=><button key={id} className={`mode-btn ${practiceMode===id?"active":""}`} onClick={()=>setPracticeMode(id)}>{m.label}</button>)}
        </div>
        <div className="row-f">
          <div className="field"><div className="field-label">Topic</div><select value={topic} onChange={e=>setTopic(e.target.value)}>{READING_TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="field"><div className="field-label">Difficulty</div><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{["5.5","6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
          <div className="field"><div className="field-label">Question focus</div><select value={focusType} onChange={e=>setFocusType(e.target.value)} disabled={practiceMode==="full"}>{READING_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          {practiceMode==="mini"&&<div className="field" style={{maxWidth:120}}><div className="field-label">Questions</div><select value={questionCount} onChange={e=>setQuestionCount(Number(e.target.value))}>{[6,8,10,12].map(n=><option key={n} value={n}>{n}</option>)}</select></div>}
        </div>
        {practiceMode!=="full"&&<div className="field" style={{marginTop:10}}>
          <div className="field-label">Wikipedia subject (optional · grounds facts in a real article)</div>
          <input type="text" value={wikiSubject} onChange={e=>setWikiSubject(e.target.value)} placeholder="e.g., bioluminescence, urban planning, Renaissance painting" style={{width:"100%"}}/>
          <div style={{fontSize:10.5,color:"var(--ink3)",marginTop:4}}>Leave blank to generate without source grounding. When filled, the AI uses real facts (names, dates, numbers) from the matching Wikipedia article instead of inventing them.</div>
        </div>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12,alignItems:"center"}}>
          <button className="btn bp" onClick={generateReadingTest} disabled={genLoading||!config}>{genLoading?<><Spinner/> {genStatus||"Generating..."}</>:`Generate ${READING_MODE_META[practiceMode].label}`}</button>
          <button className="btn bs" onClick={()=>loadTest(makeDemoReadingTest())} disabled={genLoading}>Use demo section</button>
          <span style={{fontSize:11,color:"var(--ink3)"}}>{READING_MODE_META[practiceMode].passages} passage{READING_MODE_META[practiceMode].passages>1?"s":""} · {READING_MODE_META[practiceMode].questions} questions · {Math.round(READING_MODE_META[practiceMode].duration/60)} min · {practiceMode==="full"?"~12 API calls":practiceMode==="section"?"~4 API calls":"~3 API calls"}</span>
        </div>
        {!config&&<div className="alert aw mt8">AI config required for generation. Demo section works offline.</div>}
      </div>
    </div>}

    {tab==="dataset"&&<div className="fu">
      <div className="card mb14">
        <div className="card-h"><div className="cdot"/>Reading Dataset</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65}}>
          Every generated and imported passage is saved here. When you generate a new test, one matching passage from this dataset is used as a few-shot style reference — the AI matches its register, structure, and density while creating new content. Toggle <strong>Few-shot</strong> per entry to include/exclude it from the reference pool.
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10,alignItems:"center"}}>
          <label className="btn bp" style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>
            Import JSON
            <input type="file" accept=".json" multiple style={{display:"none"}} onChange={handleLibraryImport}/>
          </label>
          <button className="btn bs" onClick={exportDataset} disabled={readingDataset.length===0}>Export dataset</button>
          <button className="btn" onClick={clearDataset} disabled={readingDataset.length===0} style={{color:"var(--rose)"}}>Clear all</button>
          <span style={{fontSize:11,color:"var(--ink3)",marginLeft:"auto"}}>{readingDataset.length} total · {fewShotCount} active as few-shot</span>
        </div>
      </div>
      <div className="card mb14">
        <div className="card-h"><div className="cdot" style={{background:"var(--honey)"}}/>Add gold reference passage</div>
        <div style={{fontSize:12,color:"var(--ink2)",lineHeight:1.65,marginBottom:10}}>
          Paste a real Cambridge IELTS passage (or any Band 7+ academic passage you trust). Even 1-2 high-quality references dramatically lift the style fidelity of every future generation — the underlying tool's README calls this the single biggest quality lever.
        </div>
        <div className="row-f">
          <div className="field"><div className="field-label">Title</div><input type="text" value={seedTitle} onChange={e=>setSeedTitle(e.target.value)} placeholder="e.g., The hidden life of trees"/></div>
          <div className="field"><div className="field-label">Topic / tags</div><input type="text" value={seedTopic} onChange={e=>setSeedTopic(e.target.value)} placeholder="e.g., biology, ecology"/></div>
          <div className="field" style={{maxWidth:140}}><div className="field-label">Band</div><select value={seedDifficulty} onChange={e=>setSeedDifficulty(e.target.value)}>{["6.0","6.5","7.0","7.5","8.0"].map(x=><option key={x} value={x}>Band {x}</option>)}</select></div>
        </div>
        <div className="field" style={{marginTop:8}}>
          <div className="field-label">Paragraphs (separate with one blank line · paragraph labels added automatically)</div>
          <textarea value={seedParagraphs} onChange={e=>setSeedParagraphs(e.target.value)} rows={8} placeholder={"First paragraph text here.\n\nSecond paragraph text here.\n\nThird paragraph text here."} style={{width:"100%",fontFamily:"inherit",fontSize:13,lineHeight:1.5,padding:8,border:"1px solid var(--border)",borderRadius:6,background:"var(--surface2)",color:"var(--ink1)",resize:"vertical"}}/>
        </div>
        <button className="btn bp" onClick={addSeedPassage} disabled={!seedTitle.trim()||!seedParagraphs.trim()} style={{marginTop:10}}>Add as reference</button>
      </div>
      {readingDataset.length>0&&<div className="mode-toggle" style={{marginBottom:10}}>
        {[{id:"all",label:"All"},{id:"generated",label:"Generated"},{id:"imported",label:"Imported"},{id:"seed",label:"Seed"},{id:"fewshot",label:"Few-shot only"}].map(f=>(
          <button key={f.id} className={`mode-btn ${datasetFilter===f.id?"active":""}`} onClick={()=>setDatasetFilter(f.id)}>{f.label}</button>
        ))}
      </div>}
      {readingDataset.length===0
        ? <div className="empty" style={{padding:28}}>Dataset is empty. Generate a test, or import JSON files from the IELTS Reading Tool (<code>data/approved/*.json</code>) or a previously exported dataset.</div>
        : filteredDataset.length===0
          ? <div className="empty" style={{padding:20}}>No entries match this filter.</div>
          : <div style={{display:"grid",gap:10}}>
              {filteredDataset.map(entry=>{
                const isFewShot = entry.useAsFewShot !== false;
                const badgeColor = entry.source==="generated" ? "var(--orchid)" : entry.source==="seed" ? "var(--honey)" : "var(--leaf)";
                const canPractice = (entry.questionCount||0) > 0;
                return <div key={entry.id} className="card" style={{padding:"12px 14px",opacity:isFewShot?1:0.7}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,padding:"1px 6px",borderRadius:4,background:badgeColor,color:"#fff",textTransform:"uppercase",letterSpacing:0.5}}>{entry.source||"imported"}</span>
                        {isFewShot&&<span style={{fontFamily:"'Geist Mono',monospace",fontSize:9.5,padding:"1px 6px",borderRadius:4,background:"var(--surface2)",color:"var(--ink2)",border:"1px solid var(--border)"}}>FEW-SHOT</span>}
                        <span style={{fontWeight:600,fontSize:13.5,color:"var(--ink1)"}}>{entry.title}</span>
                      </div>
                      <div style={{fontSize:11.5,color:"var(--ink3)"}}>{entry.topic||"—"}{entry.level?` · ${entry.level}`:""} · Section {entry.section||"?"} · {entry.questionCount} questions{entry.wordCount?` · ${entry.wordCount} words`:""}{entry.topicTags?.length>0?` · ${entry.topicTags.slice(0,3).join(", ")}`:""}</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                      <button className="btn" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>toggleFewShot(entry.id)} title={isFewShot?"Disable as few-shot reference":"Enable as few-shot reference"}>{isFewShot?"In pool":"Off pool"}</button>
                      {canPractice&&<button className="btn bp" style={{fontSize:12,padding:"5px 10px"}} onClick={()=>loadDatasetEntry(entry)}>Practice</button>}
                      <button className="btn" style={{fontSize:12,padding:"5px 10px",color:"var(--rose)"}} onClick={()=>removeDatasetEntry(entry.id)}>Remove</button>
                    </div>
                  </div>
                </div>;
              })}
            </div>
      }
    </div>}

    {tab==="test"&&<div className="fu reading-test">
      {!testData ? <div className="empty" style={{padding:28}}>Generate or load a Reading test first.</div> : <>
        <div className="reading-exam-bar">
          <div className="reading-exam-title">
            <span>IELTS Academic Reading</span>
            <strong>{testData.title}</strong>
          </div>
          <div className="reading-exam-stats">
            <span>{testData.questions.length} questions</span>
            <span>{answeredCount} answered</span>
            <span>{Object.values(flags).filter(Boolean).length} flagged</span>
            {testData.qualityWarnings?.length>0&&<span>{testData.qualityWarnings.length} checks</span>}
            <div className={`reading-time ${remaining<300&&!result?"urgent":""}`}>
              <small>{result?"time used":"time left"}</small>
              <strong>{result?formatReadingTime(elapsed):formatReadingTime(remaining)}</strong>
            </div>
            {!result&&<button className="reading-control-btn" onClick={timerRunning?pauseReadingTimer:resumeReadingTimer}>{timerRunning?"Pause":"Resume"}</button>}
            <button className="reading-control-btn muted" onClick={()=>setReadingTheme(t=>t==="light"?"dark":"light")}>{readingTheme==="light"?"Dark":"Light"}</button>
            <button className="reading-control-btn muted" onClick={resetCurrentTest}>New</button>
          </div>
        </div>

        {testData.sections.length>1&&<div className="reading-section-tabs">
          {testData.sections.map((s,i)=><button key={s.id} className={`reading-section-tab ${activeSection===i?"active":""}`} onClick={()=>setActiveSection(i)}>
            <span>Passage {i+1}</span>
            <strong>{s.questions.length}</strong>
          </button>)}
        </div>}

        <div className="reading-workstation">
          {currentSection&&<ReadingPassage
            section={currentSection}
            highlights={highlights}
            notes={readingNotes}
            onSelection={handleReadingSelection}
            onMarkClick={openReadingMarkPopover}
            onClearHighlights={()=>{
              setHighlights(h=>({...h,[currentSection.id]:[]}));
              setReadingNotes(n=>({...n,[currentSection.id]:[]}));
              setSelectionToolbar(null);
              setActiveMark(null);
            }}
          />}
          <ReadingSelectionToolbar selection={selectionToolbar} onHighlight={addHighlightFromToolbar} onUnhighlight={removeHighlightFromToolbar} onNote={addNoteFromToolbar} onClose={()=>setSelectionToolbar(null)}/>
          <ReadingMarkPopover mark={activeMark} onUnhighlight={()=>removeHighlightText(activeMark?.sectionId,activeMark?.text)} onClose={()=>setActiveMark(null)}/>
          <div className="reading-question-pane">
            <ReadingAnswerSheet testData={testData} answers={answers} result={result} flags={flags} activeSection={activeSection} setActiveSection={setActiveSection}/>
            <div className="reading-question-scroll">
              <ReadingBank title="Heading Bank" items={currentSection?.headings||[]}/>
              <ReadingBank title="Feature Bank" items={currentSection?.features||[]}/>
              {readingQuestionGroups(currentSection?.questions||[]).map(group=><ReadingQuestionGroup key={group.key+group.questions[0]?.id} group={group} section={currentSection} answers={answers} result={result} flags={flags} setAnswers={setAnswers} toggleFlag={toggleFlag}/>)}
              {!result&&<div className="reading-panel-actions"><button className="reading-submit-btn" onClick={submitAnswers}>Submit answers</button></div>}
              {result&&<ReadingReviewPanel result={result}/>}
            </div>
          </div>
        </div>
      </>}
    </div>}

    {tab==="archive"&&<div className="fu">
      <div className="cols-3">
        <div className="card stat-card"><div className="sv">{archive.length}</div><div className="sl">Attempts</div></div>
        <div className="card stat-card sc-sky"><div className="sv">{archive.length?Math.round(average*100):0}%</div><div className="sl">Avg accuracy</div></div>
        <div className="card stat-card sc-orchid"><div className="sv">{archive[0]?.band?.toFixed?.(1)||"-"}</div><div className="sl">Latest band</div></div>
      </div>
      {Object.keys(typeStats).length>0&&<div className="card">
        <div className="card-h"><div className="cdot"/>Question Type Accuracy</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(typeStats).map(([type,s])=><span key={type} className="sublist-btn" style={{cursor:"default"}}>{readingTypeLabel(type)} {s.correct}/{s.total}</span>)}</div>
      </div>}
      {archive.length===0 ? <div className="empty" style={{padding:28}}>No Reading attempts yet.</div> : <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {archive.map(a=><div key={a.id} className="card" style={{padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between",flexWrap:"wrap"}}>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.title}</div>
              <div style={{fontSize:11,color:"var(--ink3)",marginTop:3}}>{a.date} - {a.mode||"practice"} - {a.score}/{a.total} - Band {a.band?.toFixed?.(1)||a.band} - {formatReadingTime(a.elapsedSeconds||0)}</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className="btn bs bsm" onClick={()=>loadArchive(a)}>Review</button>
              <button className="btn bg bsm" onClick={()=>deleteArchive(a.id)} style={{color:"var(--rose)"}}>Delete</button>
            </div>
          </div>
        </div>)}
      </div>}
    </div>}
  </div>;
}
