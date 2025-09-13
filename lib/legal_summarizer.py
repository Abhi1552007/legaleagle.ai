import sys
import os
import re
import time
import pdfplumber
import google.generativeai as genai
from fpdf import FPDF

# Configure Gemini API
genai.configure(api_key="AIzaSyDrtysVQKlopTR60NXV_p3wCgYbsFq-mUQ")  # replace with your valid key
MODEL_NAME = "models/gemini-2.0-flash-lite"


def clean_text(text):
    """Clean and normalize text"""
    if isinstance(text, list):
        text = " ".join(str(item) for item in text)
    text = str(text)

    # Replace problematic Unicode characters
    replacements = {
        "’": "'",
        "‘": "'",
        "“": '"',
        "”": '"',
        "–": "-",
        "—": "-",
        "…": "...",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    # Keep only ASCII characters to avoid PDF encoding issues
    text = "".join(char if ord(char) < 128 else "?" for char in text)
    return re.sub(r"(_+|\s+)", " ", text).strip()

def format_points(text: str) -> str:
    """Insert newlines before numbered points so they appear one below the other"""
    # Add a newline before each numbered point (1., 2., 3., etc.)
    return re.sub(r"(?<!\n)(\d+\.\s)", r"\n\1", text).strip()


def summarize_with_gemini(text):
    """Generate numbered point summary"""
    cleaned = clean_text(text)
    if len(cleaned) < 25:
        return "[Skipped: too little content]"

    prompt = (
        "Summarize this legal text in numbered points (1., 2., 3.) "
        "for a new member. Make each point clear, simple, and easy to understand. "
        "Use plain English. Start with the most important information.\n" + cleaned
    )

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)

        summary = ""
        if hasattr(response, "text") and response.text:
            summary = response.text.strip()
        elif hasattr(response, "candidates") and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, "content") and candidate.content.parts:
                    summary = " ".join(
                        [part.text for part in candidate.content.parts if hasattr(part, "text")]
                    )
                    break

        if not summary:
            return "[No summary generated]"

        return summary

    except Exception as e:
        return f"[Error: {str(e)}]"


def extract_text_simple(pdf_path):
    """Extract text from PDF pages"""
    pages = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Document has {len(pdf.pages)} pages")

            for page_num, page in enumerate(pdf.pages):
                print(f"Extracting text from page {page_num + 1}...")
                text = page.extract_text()

                if text and len(text.strip()) > 10:
                    pages.append(text.strip())
                else:
                    pages.append("[This page contains no extractable text - may be scanned/image-based]")

            return pages

    except Exception as e:
        print(f"Error in text extraction: {e}")
        return [f"Error extracting text: {str(e)}"]


class LegalPDF(FPDF):
    def header(self):
        self.set_font("Arial", "B", 14)
        self.cell(0, 8, "Legal Document Summary", 0, 1, "C")
        self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Arial", "I", 8)
        self.cell(0, 8, f"Page {self.page_no()}", 0, 0, "C")


def wrap_multiline_text(pdf, x, y, w, h, text, font_size=9, line_height=5):
    """Properly wrap text within bounds with line breaks"""
    pdf.set_xy(x, y)
    pdf.set_font("Arial", "", font_size)

    current_y = y
    max_y = y + h - 10  # Leave margin at bottom

    lines = text.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            current_y += line_height / 2
            continue

        if current_y + line_height > max_y:
            pdf.set_xy(x, current_y)
            pdf.cell(w, line_height, "[...continued]")
            break

        if re.match(r"^\d+\.", line):
            pdf.set_font("Arial", "B", font_size)
        else:
            pdf.set_font("Arial", "", font_size)

        pdf.set_xy(x, current_y)
        temp_y = pdf.get_y()
        pdf.multi_cell(w, line_height, line, border=0)
        new_y = pdf.get_y()

        if new_y > max_y:
            pdf.set_xy(x, temp_y)
            pdf.cell(w, line_height, "[...text continues...]")
            break

        current_y = new_y + 1

    return current_y


def export_side_by_side_pdf(chunks, summaries, pdf_path):
    """Generate side-by-side PDF with proper line breaking"""
    try:
        pdf = LegalPDF()

        # Page dimensions
        margin = 15
        page_width = 210  # A4 width
        col_gap = 8
        col_width = (page_width - 2 * margin - col_gap) / 2
        header_y = 25
        box_height = 240

        for i, (original, summary) in enumerate(zip(chunks, summaries), 1):
            pdf.add_page()

            # Page header
            pdf.set_font("Arial", "B", 12)
            pdf.set_xy(margin, header_y - 5)
            pdf.cell(0, 8, f"Document Page {i}", 0, 1, "C")

            # Column headers
            pdf.set_font("Arial", "B", 10)
            pdf.set_xy(margin, header_y + 5)
            pdf.cell(col_width, 8, "Original Text", 1, 0, "C")
            pdf.set_xy(margin + col_width + col_gap, header_y + 5)
            pdf.cell(col_width, 8, "Gemini Summary", 1, 0, "C")

            # Content boxes
            content_y = header_y + 15
            pdf.rect(margin, content_y, col_width, box_height)
            pdf.rect(margin + col_width + col_gap, content_y, col_width, box_height)

            # Clean text for PDF
            original_clean = clean_text(original)
            summary_clean = clean_text(summary)

            summary_clean = format_points(summary_clean)

            # Left column
            wrap_multiline_text(
                pdf,
                margin + 2,
                content_y + 3,
                col_width - 4,
                box_height - 6,
                original_clean,
                font_size=8,
                line_height=4,
            )

            # Right column
            wrap_multiline_text(
                pdf,
                margin + col_width + col_gap + 2,
                content_y + 3,
                col_width - 4,
                box_height - 6,
                summary_clean,
                font_size=9,
                line_height=5,
            )

        pdf.output(pdf_path)
        print(f"PDF saved successfully: {pdf_path}")
        return True

    except Exception as e:
        print(f"PDF generation error: {e}")
        return False


def main():
    print("Legal Document Text Summarizer")
    print(f"Arguments: {sys.argv}")

    if len(sys.argv) != 3:
        print("Usage: python legal_summarizer.py <input_pdf> <output_pdf>")
        sys.exit(1)

    try:
        input_pdf = sys.argv[1].strip()
        output_pdf = sys.argv[2].strip()

        if not os.path.exists(input_pdf):
            print(f"Error: Input file '{input_pdf}' does not exist")
            sys.exit(1)

        print(f"Processing: {input_pdf}")
        start_time = time.time()

        # Extract text from PDF
        page_texts = extract_text_simple(input_pdf)
        print("Text extraction completed")

        # Generate summaries
        summaries = []
        for i, page_text in enumerate(page_texts, 1):
            print(f"Summarizing page {i}...")
            summary = summarize_with_gemini(page_text)
            summaries.append(summary)
            time.sleep(1)  # rate limiting

        print("Creating PDF with proper line wrapping...")
        success = export_side_by_side_pdf(page_texts, summaries, output_pdf)

        total_time = time.time() - start_time
        if success:
            print(f"✅ SUCCESS! Processing completed in {total_time:.2f} seconds")
            print(f"📄 Output saved to: {output_pdf}")
            print(f"📊 Processed {len(page_texts)} pages")
        else:
            print("❌ FAILED to create PDF")
            sys.exit(1)

    except Exception as e:
        print(f"Error in main: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
