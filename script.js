const GEMINI_API_KEY = "AIzaSyAReylT81P9pEZ_ArKj2cNShRNixyKSBRk"; 
const GEMINI_MODEL = "gemini-1.5-flash"; 

async function callGemini(text){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
You are a flashcard generator.
Input text:
<<<
${text}
>>>
Generate flashcards in strict JSON format only (no markdown, no extra text):
{
  "cards":[
    {"question":"...","answer":"..."},
    {"question":"...","answer":"..."}
  ]
}
`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const r = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  // ✅ Clean Gemini output (remove ```json ... ``` wrappers)
  raw = raw.replace(/```json/g, "")
           .replace(/```/g, "")
           .trim();

  try {
    return JSON.parse(raw);
  } catch(e){
    console.error("Parse error:", e, raw);
    return {cards:[]};
  }
}

document.getElementById('generateBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('inputText').value.trim();
  if(!text){ alert("Paste some study material"); return; }
  document.getElementById('status').textContent = "⏳ Generating...";
  const result = await callGemini(text);
  const cards = result.cards || [];
  renderCards(cards);
  document.getElementById('status').textContent = `✅ ${cards.length} cards`;
});

function renderCards(cards){
  const c = document.getElementById('cardsContainer');
  c.innerHTML = "";
  cards.forEach((card, idx)=>{
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="q">Q${idx+1}: ${escapeHtml(card.question||"")}</div>
      <div class="a">${escapeHtml(card.answer||"")}</div>
    `;
    c.appendChild(el);
  });
}

function escapeHtml(s){
  return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}
