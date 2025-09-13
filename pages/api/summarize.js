import { exec } from 'child_process';
import { promisify } from 'util';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
    // Ensure tmp directory exists
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: tmpDir,
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Input file:', file.filepath);

    // Generate unique output filename
    const timestamp = Date.now();
    const outputPath = path.join(tmpDir, `summary_${timestamp}.pdf`);

    console.log('Output path:', outputPath);

    try {
      // Execute Python script
      const command = `python lib/legal_summarizer.py "${file.filepath}" "${outputPath}"`;
      console.log('Executing command:', command);
      
      const { stdout, stderr } = await execAsync(command);
      console.log('Python stdout:', stdout);
      if (stderr) console.log('Python stderr:', stderr);

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Output file not created at ${outputPath}`);
      }

      // Read the generated PDF
      const pdfBuffer = fs.readFileSync(outputPath);
      console.log('PDF file size:', pdfBuffer.length);

      // Clean up files
      fs.unlinkSync(file.filepath);
      fs.unlinkSync(outputPath);

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="summary.pdf"');
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Python script error:', error);
      
      // Clean up input file if it exists
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      
      res.status(500).json({ error: 'Failed to process document: ' + error.message });
    }

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}
