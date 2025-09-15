// No API key needed on the front-end anymore!
const PROXY_URL = "http://localhost:3000/generate-flashcards";

// Get elements once at the top of the script
const studyMaterialInput = document.getElementById("studyMaterial");
const generateBtn = document.getElementById("generateBtn");
const flashcardContainer = document.getElementById("flashcardContainer");
const loadingIndicator = document.getElementById("loading");

generateBtn.addEventListener("click", async () => {
    const studyMaterial = studyMaterialInput.value.trim();

    if (studyMaterial.length < 50) {
        alert("Please enter more text to generate useful flashcards.");
        return;
    }

    flashcardContainer.innerHTML = '';
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const prompt = `
        You are a flashcard generator. Given the following text, create a list of question-and-answer pairs suitable for study flashcards.
        The output must be a simple, clean, parsable JSON array of objects.
        Each object should have two keys: "question" and "answer".
        Do not include any extra text, explanations, or markdown outside of the JSON array.
        Example format:
        [
            {"question": "What is the capital of France?", "answer": "Paris"},
            {"question": "Who painted the Mona Lisa?", "answer": "Leonardo da Vinci"}
        ]
        
        Text to analyze:
        ${studyMaterial}
    `;

    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`Proxy call failed with status: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Use a simple parsing strategy since the model is instructed to only return JSON
        const jsonText = generatedText.substring(generatedText.indexOf('['), generatedText.lastIndexOf(']') + 1);
        const flashcards = JSON.parse(jsonText);

        if (flashcards.length === 0) {
            flashcardContainer.innerHTML = '<p>No flashcards could be generated from the provided text.</p>';
        } else {
            flashcards.forEach(card => {
                const flashcardDiv = document.createElement("div");
                flashcardDiv.classList.add("flashcard");
                flashcardDiv.innerHTML = `
                    <h3>Question:</h3>
                    <p>${card.question}</p>
                    <h3 class="answer">Answer:</h3>
                    <p class="answer" style="display:none;">${card.answer}</p>
                `;
                
                flashcardDiv.addEventListener('click', () => {
                    const answerElement = flashcardDiv.querySelector('.answer');
                    if (answerElement) {
                        answerElement.style.display = answerElement.style.display === 'none' ? 'block' : 'none';
                    }
                });
                flashcardContainer.appendChild(flashcardDiv);
            });
        }
        
    } catch (error) {
        console.error("Failed to generate flashcards:", error);
        flashcardContainer.innerHTML = `<p>An error occurred. Please try again. Error: ${error.message}</p>`;
    } finally {
        loadingIndicator.classList.add('hidden');
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Flashcards';
    }
});