import pdfParse from "pdf-parse";

// Extracts raw text from a PDF buffer. Replaces the old client-side
// pdf2img.ts approach (which rendered the PDF to a canvas in the browser
// and sent an image to the LLM) with server-side text extraction, which is
// cheaper and more reliable than an image round-trip.
export async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

// Cloudinary can render a PDF's first page as an image on the fly via a
// URL transformation, so we don't need a separate image-conversion step —
// just derive the preview URL from the uploaded PDF's secure_url.
export function buildPdfPreviewImageUrl(secureUrl) {
  // e.g. .../upload/v123/resumes/abc.pdf -> .../upload/pg_1/v123/resumes/abc.jpg
  return secureUrl.replace("/upload/", "/upload/pg_1/").replace(/\.pdf$/i, ".jpg");
}
