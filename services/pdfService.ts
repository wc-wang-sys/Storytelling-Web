import { jsPDF } from "jspdf";
import { Story } from "../types";

/**
 * Converts an image URL to a Base64 string if it isn't one already.
 * This is useful for fallback images (picsum) to ensure they render in the PDF.
 */
const getImageData = async (url: string): Promise<string> => {
  if (url.startsWith('data:image')) {
    return url;
  }
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to fetch image for PDF", e);
    return "";
  }
};

export const generatePDF = async (story: Story) => {
  // Create landscape PDF (A4)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 20;

  // --- COVER PAGE ---
  
  // Background color for cover
  doc.setFillColor('#f0f9ff');
  doc.rect(0, 0, width, height, 'F');

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(story.styling.titleColor || '#7209B7');
  doc.text(story.title, width / 2, margin + 20, { align: 'center' });

  // Cover Image
  if (story.coverImage) {
    try {
        const coverData = await getImageData(story.coverImage);
        if (coverData) {
            const imgSize = 100;
            const x = (width - imgSize) / 2;
            doc.addImage(coverData, 'PNG', x, margin + 40, imgSize, imgSize);
        }
    } catch(e) { console.warn("Could not add cover image", e); }
  }
  
  // Author
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor('#555555');
  doc.text(`Created by: ${story.authorName}`, width / 2, height - margin - 10, { align: 'center' });
  doc.text(`A StoryBuddy Adventure`, width / 2, height - margin, { align: 'center' });

  // --- STORY PAGES ---
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];
    doc.addPage();
    
    // Page Layout: Image Left, Text Right
    
    // Page Border/Background
    doc.setDrawColor('#4CC9F0');
    doc.setLineWidth(1);
    doc.rect(5, 5, width - 10, height - 10);
    
    // Image
    if (page.imageUrl) {
        try {
            const imgData = await getImageData(page.imageUrl);
            if (imgData) {
                // Square image on the left
                const imgSize = height - (margin * 2);
                doc.addImage(imgData, 'PNG', margin, margin, imgSize, imgSize);
            }
        } catch(e) { console.warn("Could not add page image", e); }
    }

    // Text Area
    const textX = margin + (height - (margin * 2)) + 15; // Image X + Image Width + Gap
    const textWidth = width - textX - margin;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(22);
    doc.setTextColor('#333333');
    
    const splitText = doc.splitTextToSize(page.text, textWidth);
    
    // Center text vertically relative to the image
    // Simple vertical centering approximation
    const textBlockHeight = splitText.length * 10; // approx height
    const textY = (height / 2) - (textBlockHeight / 2);
    
    doc.text(splitText, textX, Math.max(margin + 20, textY));
    
    // Page Number
    doc.setFontSize(10);
    doc.setTextColor('#aaaaaa');
    doc.text(`${i + 1}`, width - 15, height - 10);
  }

  // Save the PDF
  const filename = `${story.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
  doc.save(filename);
};