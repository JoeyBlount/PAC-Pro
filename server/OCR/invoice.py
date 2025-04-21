from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import tempfile
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import torch
from transformers import AutoProcessor, LayoutLMv3ForTokenClassification

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Initialize LayoutLMv3 model and processor
MODEL_NAME = "Theivaprakasham/layoutlmv3-finetuned-invoice"
processor = AutoProcessor.from_pretrained(MODEL_NAME, apply_ocr=False)
model = LayoutLMv3ForTokenClassification.from_pretrained(MODEL_NAME)

@app.route('/api/upload', methods=['POST'])
def upload_invoice():
    if 'invoice' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['invoice']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Convert image to searchable PDF
        img = Image.open(file.stream)
        pdf_path = convert_image_to_pdf(img)

        # Extract data using LayoutLMv3
        extracted_data = extract_data_from_pdf(pdf_path)

        # Return PDF URL and extracted data
        return jsonify({
            'pdf_url': f'http://localhost:5000/download/{os.path.basename(pdf_path)}',
            'extracted': extracted_data
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def convert_image_to_pdf(image):
    """Convert an image to a searchable PDF."""
    pdf_path = tempfile.mktemp(suffix='.pdf')
    text = pytesseract.image_to_string(image)
    pdf_bytes = fitz.open()
    pdf_page = pdf_bytes.new_page(width=image.width, height=image.height)
    pdf_page.insert_text((0, 0), text)
    pdf_bytes.save(pdf_path)
    return pdf_path

def extract_data_from_pdf(pdf_path):
    """Extract structured data from a PDF using LayoutLMv3."""
    # Implement the extraction logic here
    return {"example_field": "example_value"}

@app.route('/download/<filename>')
def download_file(filename):
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
