import { exec } from 'child_process';
import { promisify } from 'util';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use system temp directory (e.g. /tmp) for Vercel
    const baseTmpDir = path.join(os.tmpdir(), 'legal-summarizer');
    if (!fs.existsSync(baseTmpDir)) {
      fs.mkdirSync(baseTmpDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: baseTmpDir,
      keepExtensions: true,
    });

    // Parse form with Promise wrapper because formidable.parse doesn't return Promise by default
    const parseForm = () => new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const [fields, files] = await parseForm();
    const file = files.file?.[0] || files.file; // handle single file or array

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Input file:', file.filepath || file.filepath);

    // Generate unique output filename in temp directory
    const timestamp = Date.now();
    const outputPath = path.join(baseTmpDir, `summary_${timestamp}.pdf`);

    console.log('Output path:', outputPath);

    try {
      // Execute Python summarizer script
      const command = `python lib/legal_summarizer.py "${file.filepath || file.filepath}" "${outputPath}"`;
      console.log('Executing command:', command);
      
      const { stdout, stderr } = await execAsync(command);
      console.log('Python stdout:', stdout);
      if (stderr) console.log('Python stderr:', stderr);

      // Check if output PDF was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Output file not created at ${outputPath}`);
      }

      // Read generated summary PDF
      const pdfBuffer = fs.readFileSync(outputPath);
      console.log('PDF file size:', pdfBuffer.length);

      // Clean up temp files
      if (file.filepath && fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      // Send PDF as response for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="summary.pdf"');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Python script error:', error);
      // Clean up uploaded file if exists
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      res.status(500).json({ error: 'Failed to process document: ' + error.message });
    }

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
