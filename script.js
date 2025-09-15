const GEMINI_API_KEY = "AIzaSyAReylT81P9pEZ_ArKj2cNShRNixyKSBRk"; 
const GEMINI_MODEL = "gemini-1.5-flash"; 

// 🔹 Call Gemini API
async function callGemini(text, mode="flashcards"){
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  let prompt = "";
  if(mode==="flashcards"){
    prompt = `
You are a flashcard generator.
Input text:
<<<
${text}
>>>
Generate flashcards in strict JSON:
{
  "cards":[
    {"question":"...","answer":"..."}
  ]
}
    `;
  } else if(mode==="analysis"){
    prompt = `
Analyze the text and return JSON:
{
  "summary":"short summary...",
  "keywords":["k1","k2","k3"]
}
Input text:
${text}
    `;
  }

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

  raw = raw.replace(/```json/g,"").replace(/```/g,"").trim();

  try { return JSON.parse(raw); }
  catch(e){ console.error("Parse error", e, raw); return {}; }
}

// 🔹 Flashcards
document.getElementById('generateBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('inputText').value.trim();
  if(!text) return alert("Paste or upload some study material");
  document.getElementById('status').textContent = "⏳ Generating flashcards...";
  const result = await callGemini(text,"flashcards");
  renderCards(result.cards||[]);
  document.getElementById('status').textContent = `✅ ${result.cards?.length||0} cards`;
});

// 🔹 Analysis + Books
document.getElementById('analyzeBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('inputText').value.trim();
  if(!text) return alert("Paste or upload some study material");
  document.getElementById('status').textContent = "⏳ Analyzing...";
  const result = await callGemini(text,"analysis");

  document.getElementById('summary').innerHTML = `
    <h3>📌 Summary</h3><p>${escapeHtml(result.summary||"N/A")}</p>
    <h4>Keywords: ${result.keywords?.join(", ")||"N/A"}</h4>
  `;

  // Book suggestions
  const books = await suggestBooks((result.keywords?.[0]) || "education");
  let html = "<h3>📚 Suggested Books</h3>";
  books.forEach(b=>{
    html += `<p><strong>${b.title}</strong> by ${b.authors}<br><a href="${b.link}" target="_blank">Preview</a></p>`;
  });
  document.getElementById('bookSuggestions').innerHTML = html;

  document.getElementById('status').textContent = "✅ Analysis complete";
});

// 🔹 Google Books API
async function suggestBooks(query){
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=4`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items?.map(b=>({
    title: b.volumeInfo.title,
    authors: b.volumeInfo.authors?.join(", ") || "Unknown",
    link: b.volumeInfo.previewLink
  })) || [];
}

// 🔹 PDF/TXT Upload
document.getElementById("fileInput").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  document.getElementById('status').textContent = "⏳ Reading file...";

  try {
    const text = await readFile(file);
    document.getElementById("inputText").value = text; // limit input
    document.getElementById('status').textContent = `✅ Loaded "${file.name}"`;
  } catch(err){
    console.error(err);
    document.getElementById('status').textContent = "❌ Error reading file";
  }
});


// read PDF/TXT
async function readFile(file){
  if(file.type==="text/plain"){
    return await file.text();
  }
  if(file.type==="application/pdf"){
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text="";
    for(let i=1;i<=pdf.numPages;i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it=>it.str).join(" ")+"\n";
    }
    return text;
  }
  alert("Unsupported file type");
}

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
