const GEMINI_API_KEY = "AIzaSyBpwgj7PqbHb6dRvnxEztcjUZnFTGgwWhc"; 
const GEMINI_MODEL = "gemini-1.5-flash"; 
const YOUTUBE_API_KEY = "AIzaSyCIRiWkWZHFVR9uE30hny1D34YKkPRFU0I";

let currentQuizData = [];
let userAnswers = [];

// ------------------ Gemini API Call ------------------
async function callGemini(text, mode="flashcards") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  let prompt = "";
  if(mode==="flashcards"){
    prompt = `
You are a quiz generator that creates multiple choice questions.
Input text:
<<<
${text}
>>>
Generate quiz questions in strict JSON format:
{
  "cards":[
    {
      "question":"What is the main concept?",
      "options":["Option A","Option B","Option C","Option D"],
      "answer":"Option A",
      "explanation":"Brief explanation of why this is correct"
    }
  ]
}

Important rules:
- Generate 5-10 questions maximum
- Each question should have exactly 4 options
- The answer should be one of the 4 options exactly
- Include a brief explanation for each answer
- Focus on key concepts from the text
    `;
  } else if(mode==="analysis") {
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

  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
  const r = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
  const data = await r.json();
  let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  raw = raw.replace(/```json/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(raw); } catch(e){ console.error("Parse error", e, raw); return {}; }
}

// ------------------ Quiz Generation ------------------
document.getElementById('generateBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('inputText').value.trim();
  if(!text) return alert("Please paste or upload some study material");
  document.getElementById('status').innerHTML = '<div class="loading"></div> Generating quiz cards...';
  try {
    const result = await callGemini(text,"flashcards");
    currentQuizData = result.cards || [];
    userAnswers = new Array(currentQuizData.length).fill(null);
    renderQuizCards(currentQuizData);
    showStats();
    document.getElementById('status').textContent = `✅ ${currentQuizData.length} quiz cards generated`;
  } catch (error) {
    console.error('Error generating quiz:', error);
    document.getElementById('status').textContent = "❌ Error generating quiz cards";
  }
});

// ------------------ Analysis + Books + YouTube ------------------
document.getElementById('analyzeBtn').addEventListener('click', async ()=> {
  const text = document.getElementById('inputText').value.trim();
  if(!text) return alert("Please paste or upload some study material");
  document.getElementById('status').innerHTML = '<div class="loading"></div> Analyzing content...';
  try {
    const result = await callGemini(text,"analysis");
    const summaryDiv = document.getElementById('summary');
    summaryDiv.style.display = 'block';
    summaryDiv.innerHTML = `<h3>📌 Content Summary</h3><p>${escapeHtml(result.summary||"No summary available")}</p>
      <div class="keywords">${(result.keywords||[]).map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')}</div>`;

    const books = await suggestBooks(result.keywords?.[0] || "education");
    const booksDiv = document.getElementById('bookSuggestions');
    booksDiv.style.display = 'block';
    booksDiv.innerHTML = `<h3>📚 Recommended Books</h3>` + books.map(book => `
      <div class="book-item">
        <div class="book-title">${escapeHtml(book.title)}</div>
        <div class="book-authors">by ${escapeHtml(book.authors)}</div>
        <a href="${book.link}" target="_blank" class="book-link">📖 Preview Book</a>
      </div>`).join('');

    const youtubeQuery = result.keywords?.[0] || text.split(" ").slice(0,10).join(" ");
    await renderYouTubeSuggestions(youtubeQuery);

    document.getElementById('status').textContent = "✅ Analysis complete";
  } catch (error) {
    console.error('Error analyzing content:', error);
    document.getElementById('status').textContent = "❌ Error analyzing content";
  }
});

// ------------------ YouTube Suggestions ------------------
async function suggestYouTubeVideos(query) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query + " tutorial")}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if(!data.items) return [];
    return data.items.map(item => ({
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      videoId: item.id.videoId,
      link: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
  } catch (error) { console.error(error); return []; }
}

async function renderYouTubeSuggestions(query){
  const videos = await suggestYouTubeVideos(query);
  const container = document.getElementById("youtubeSuggestions");
  container.style.display = 'block';
  container.innerHTML = `<h3>🎥 Suggested YouTube Videos</h3>` + videos.map(v => `
    <div class="book-item">
      <div class="book-title">${escapeHtml(v.title)}</div>
      <div class="book-authors">by ${escapeHtml(v.channelTitle)}</div>
      <a href="${v.link}" target="_blank" class="book-link">▶ Watch Video</a>
    </div>`).join('');
}

// ------------------ Book Suggestions ------------------
async function suggestBooks(query){
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=4`;
    const res = await fetch(url);
    const data = await res.json();
    return data.items?.map(b=>({
      title: b.volumeInfo.title || "Unknown Title",
      authors: b.volumeInfo.authors?.join(", ") || "Unknown Author",
      link: b.volumeInfo.previewLink || "#"
    })) || [];
  } catch (error) { console.error(error); return []; }
}

// ------------------ File Upload ------------------
document.getElementById("fileInput").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  document.getElementById('status').innerHTML = '<div class="loading"></div> Reading file...';
  try {
    const text = await readFile(file);
    document.getElementById("inputText").value = text.substring(0, 10000);
    document.getElementById('status').textContent = `✅ Loaded "${file.name}"`;
  } catch(err){
    console.error(err);
    document.getElementById('status').textContent = "❌ Error reading file";
  }
});

async function readFile(file){
  if(file.type==="text/plain"){ return await file.text(); }
  if(file.type==="application/pdf"){
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text="";
    for(let i=1;i<=Math.min(pdf.numPages, 50);i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(it=>it.str).join(" ")+"\n";
    }
    return text;
  }
  throw new Error("Unsupported file type. Please use PDF or TXT files.");
}

// ------------------ Quiz Rendering ------------------
function renderQuizCards(cards){
  const container = document.getElementById('quizContainer');
  container.innerHTML = "";
  cards.forEach((card, idx)=>{
    const cardElement = document.createElement('div');
    cardElement.className = 'flashcard';
    cardElement.innerHTML = `
      <div class="flashcard-inner">
        <div class="flashcard-front">
          <div class="card-number">${idx+1}/${cards.length}</div>
          <div class="question">${escapeHtml(card.question||"")}</div>
          <div class="options">
            ${(card.options||[]).map((option, optIdx) => `
              <div class="option" data-card="${idx}" data-option="${optIdx}">
                ${String.fromCharCode(65+optIdx)}. ${escapeHtml(option)}
              </div>`).join('')}
          </div>
          <div class="flip-instruction">Select an answer to reveal the result</div>
        </div>
        <div class="flashcard-back">
          <div class="answer-section">
            <div class="result-badge" id="result-${idx}">Answer</div>
            <div class="answer-text">Correct Answer: ${escapeHtml(card.answer||"")}</div>
            <p><strong>Explanation:</strong> ${escapeHtml(card.explanation||"No explanation provided")}</p>
          </div>
        </div>
      </div>`;
    container.appendChild(cardElement);
  });

  document.querySelectorAll('.option').forEach(option => option.addEventListener('click', handleOptionClick));
}

function handleOptionClick(e) {
  const cardIdx = parseInt(e.target.dataset.card);
  const optionIdx = parseInt(e.target.dataset.option);
  const card = currentQuizData[cardIdx];
  const selectedOption = card.options[optionIdx];
  userAnswers[cardIdx] = selectedOption;

  const cardOptions = document.querySelectorAll(`[data-card="${cardIdx}"]`);
  cardOptions.forEach(opt => { opt.style.pointerEvents = 'none'; 
    if (opt.textContent.includes(selectedOption)) opt.classList.add(selectedOption === card.answer ? 'correct' : 'incorrect');
  });

  if (selectedOption !== card.answer) {
    cardOptions.forEach(opt => { if (opt.textContent.includes(card.answer)) opt.classList.add('correct'); });
  }

  const resultBadge = document.getElementById(`result-${cardIdx}`);
  if (selectedOption === card.answer) {
    resultBadge.textContent = '✅ Correct!'; resultBadge.className = 'result-badge correct';
  } else { resultBadge.textContent = '❌ Incorrect'; resultBadge.className = 'result-badge incorrect'; }

  setTimeout(()=>{ e.target.closest('.flashcard').classList.add('flipped'); showStats(); }, 500);
}

// ------------------ Stats ------------------
function showStats() {
  const answered = userAnswers.filter(a => a !== null).length;
  const correct = userAnswers.filter((answer, idx) => answer && answer === currentQuizData[idx]?.answer).length;
  if(answered > 0){
    const percentage = Math.round((correct / answered) * 100);
    document.getElementById('statsContainer').innerHTML = `
      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">${answered}</div>
          <div class="stat-label">Answered</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${correct}</div>
          <div class="stat-label">Correct</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${percentage}%</div>
          <div class="stat-label">Score</div>
        </div>
      </div>`;
  }
}

// ------------------ Utilities ------------------
function escapeHtml(text){ const div = document.createElement('div'); div.textContent = text || ''; return div.innerHTML; }