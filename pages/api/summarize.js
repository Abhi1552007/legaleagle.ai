import formidable from "formidable";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import pdfParse from "pdf-parse";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fontkit from "@pdf-lib/fontkit";

export const config = {
  api: { bodyParser: false },
};

// Extract text page by page
async function extractTextByPage(pdfBuffer) {
  const pages = [];
  const options = {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      pages.push(pageText.trim());
      return "";
    },
  };
  await pdfParse(pdfBuffer, options);
  return pages;
}

// Summarize a single page
async function summarizePage(text, genAI) {
  if (!text || text.length < 25) return "[Skipped: too little content]";
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Summarize this legal text in numbered points (1., 2., 3.)
Use plain English. Start with the most important points.

${text}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini error:", err.message);
    return `[Error: ${err.message}]`;
  }
}

// Helper to wrap text (bold numbers in summary)
function drawWrappedText(page, text, { x, y, width, font, boldFont, size, lineHeight }) {
  const lines = text.split("\n");
  let cursorY = y;

  for (let line of lines) {
    const isNumbered = /^\d+\./.test(line.trim());
    const currentFont = isNumbered ? boldFont : font;

    const words = line.split(/\s+/);
    let currentLine = "";

    for (let word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = currentFont.widthOfTextAtSize(testLine, size);

      if (testWidth > width) {
        page.drawText(currentLine, { x, y: cursorY, size, font: currentFont });
        cursorY -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, { x, y: cursorY, size, font: currentFont });
      cursorY -= lineHeight;
    }
  }
}

// Build side-by-side PDF with boxes + footer page numbers
async function buildSideBySidePdf(originalPages, summaries) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load fonts (put fonts in /public/fonts)
  const fontBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf"));
  const boldFontBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf"));

  const font = await pdfDoc.embedFont(fontBytes);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  for (let i = 0; i < originalPages.length; i++) {
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();

    const margin = 40;
    const colGap = 20;
    const colWidth = (595 - 2 * margin - colGap) / 2;
    const boxTop = height - 80;
    const boxHeight = 700;

    // Title
    page.drawText(`Document Page ${i + 1}`, {
      x: margin,
      y: height - 40,
      size: 14,
      font: boldFont,
    });

    // Headers
    page.drawText("Original Text", { x: margin, y: height - 60, size: 10, font: boldFont });
    page.drawText("Gemini Summary", {
      x: margin + colWidth + colGap,
      y: height - 60,
      size: 10,
      font: boldFont,
    });

    // Draw boxes
    page.drawRectangle({
      x: margin - 5,
      y: boxTop - boxHeight,
      width: colWidth + 10,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawRectangle({
      x: margin + colWidth + colGap - 5,
      y: boxTop - boxHeight,
      width: colWidth + 10,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Original text
    drawWrappedText(page, originalPages[i], {
      x: margin,
      y: boxTop - 20,
      width: colWidth,
      font,
      boldFont,
      size: 9,
      lineHeight: 12,
    });

    // Summary text
    drawWrappedText(page, summaries[i], {
      x: margin + colWidth + colGap,
      y: boxTop - 20,
      width: colWidth,
      font,
      boldFont,
      size: 9,
      lineHeight: 12,
    });

    // Footer page number
    page.drawText(`Page ${i + 1} of ${originalPages.length}`, {
      x: 270,
      y: 20,
      size: 10,
      font,
    });
  }

  return await pdfDoc.save();
}

// API Handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({});
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable error:", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    try {
      const file = files.file?.[0] || files.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const pdfBuffer = fs.readFileSync(file.filepath);

      // Extract text page by page
      const originalPages = await extractTextByPage(pdfBuffer);

      // Summarize each page
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const summaries = [];
      for (const pageText of originalPages) {
        const summary = await summarizePage(pageText, genAI);
        summaries.push(summary);
      }

      // Build final PDF
      const finalPdfBytes = await buildSideBySidePdf(originalPages, summaries);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=summary.pdf");
      res.send(Buffer.from(finalPdfBytes));
    } catch (error) {
      console.error("Summarize API error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });
}
