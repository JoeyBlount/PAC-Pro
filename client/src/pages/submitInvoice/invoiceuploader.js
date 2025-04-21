import React, { useState } from 'react';

function InvoiceUploader() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please choose a file first!");

    setLoading(true);
    const formData = new FormData();
    formData.append("invoice", file);

    try {
      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setPdfUrl(data.pdf_url);
      setResult(data.extracted);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Something went wrong while uploading the file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🧾 Upload Invoice for OCR</h2>
      <input type="file" onChange={handleFileChange} accept="image/*" />
      <button onClick={handleUpload} disabled={loading} style={{ marginLeft: "1rem" }}>
        {loading ? "Processing..." : "Upload & Analyze"}
      </button>

      {pdfUrl && (
        <div style={{ marginTop: "2rem" }}>
          <h3>📄 Generated PDF:</h3>
          <iframe src={pdfUrl} width="100%" height="600px" title="Generated PDF"></iframe>
        </div>
      )}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <h3>🔍 Extracted Data:</h3>
          <pre style={{ background: "#eee", padding: "1rem" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default InvoiceUploader;
