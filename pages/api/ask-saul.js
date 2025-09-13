import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, documentText, fileName } = req.body;

    if (!question || !documentText) {
      return res.status(400).json({ error: "Missing question or document text" });
    }

    const prompt = `
    You are Saul Goodman, a witty but sharp legal expert. 
    Keep your answers SHORT, CLEAR, and TO THE POINT — no rambling, no long speeches. 
    Use numbered or bulleted points if helpful. 

    User uploaded a legal document: "${fileName}".
    Summary: ${documentText}

    Question: ${question}

    Give a concise, practical answer (2–4 sentences max) with just a touch of Saul’s personality.
    `;


    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    const answer =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.response?.text ||
      "Sorry, I couldn’t come up with an answer.";

    res.status(200).json({ answer });
  } catch (err) {
    console.error("Ask Saul error:", err);
    res
      .status(500)
      .json({ answer: "⚠️ Saul ran into some technical issues. Try again later." });
  }
}
