interface PdfPreviewProps {
  pdfUrl: string | null;
}

export function PdfPreview({ pdfUrl }: PdfPreviewProps) {
  if (!pdfUrl) {
    return (
      <div style={{ padding: "12px", color: "#888" }}>
        No preview yet — compile to see the PDF.
      </div>
    );
  }

  return (
    <iframe
      key={pdfUrl}
      src={pdfUrl}
      title="PDF Preview"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100%",
        border: "none",
        display: "block",
      }}
    />
  );
}
