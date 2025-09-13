import pdf from "pdf-parse";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const fileBuffer = Buffer.from(await req.body.arrayBuffer());
    const data = await pdf(fileBuffer);

    res.status(200).json({ text: data.text });
  } catch (err) {
    console.error("PDF extract error:", err);
    res.status(500).json({ error: "Failed to extract text" });
  }
}
