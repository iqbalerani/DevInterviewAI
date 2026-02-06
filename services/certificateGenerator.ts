import jsPDF from 'jspdf';

export interface CertificateData {
  candidateName: string;
  sessionId: string;
  date: string;
  overallScore: number;
  scores: { technical: number; coding: number; communication: number; problemSolving: number };
  strengths: string[];
  jobTitle: string;
}

function getRatingLabel(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong Hire';
  if (score >= 65) return 'Proficient';
  return 'Developing';
}

function getRatingColor(score: number): [number, number, number] {
  if (score >= 90) return [34, 197, 94];
  if (score >= 80) return [59, 130, 246];
  if (score >= 65) return [234, 179, 8];
  return [249, 115, 22];
}

export function generateCertificatePDF(data: CertificateData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297;
  const H = 210;
  const accent: [number, number, number] = [59, 130, 246]; // blue-500

  // --- Background ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, W, H, 'F');

  // --- Top & bottom accent bars ---
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 7, 'F');
  doc.rect(0, H - 7, W, 7, 'F');

  // --- Double border ---
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setDrawColor(100, 116, 139); // slate-500
  doc.setLineWidth(0.3);
  doc.rect(13, 13, W - 26, H - 26);

  // --- Brand header ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...accent);
  const brand = 'D E V P R O O F';
  doc.text(brand, W / 2, 26, { align: 'center' });

  // --- Title ---
  doc.setFontSize(22);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text('CERTIFICATE OF ACHIEVEMENT', W / 2, 38, { align: 'center' });

  // --- Decorative line ---
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 40, 42, W / 2 + 40, 42);

  // --- Certify text ---
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('This is to certify that', W / 2, 52, { align: 'center' });

  // --- Candidate name ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(241, 245, 249); // slate-100
  const nameY = 64;
  doc.text(data.candidateName, W / 2, nameY, { align: 'center' });
  // Underline
  const nameWidth = doc.getTextWidth(data.candidateName);
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - nameWidth / 2, nameY + 2, W / 2 + nameWidth / 2, nameY + 2);

  // --- Job description text ---
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('has successfully completed an AI-powered technical interview assessment for', W / 2, 74, { align: 'center' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(226, 232, 240);
  const jobTitle = data.jobTitle.length > 60 ? data.jobTitle.substring(0, 57) + '...' : data.jobTitle;
  doc.text(jobTitle, W / 2, 82, { align: 'center' });

  // --- Overall score circle ---
  const scoreX = W / 2;
  const scoreY = 102;
  const scoreR = 14;
  const ratingColor = getRatingColor(data.overallScore);

  // Outer ring
  doc.setDrawColor(...ratingColor);
  doc.setLineWidth(1.5);
  doc.circle(scoreX, scoreY, scoreR);

  // Inner fill (subtle tint)
  doc.setFillColor(
    Math.min(255, ratingColor[0] + Math.round((15 - ratingColor[0]) * 0.85)),
    Math.min(255, ratingColor[1] + Math.round((23 - ratingColor[1]) * 0.85)),
    Math.min(255, ratingColor[2] + Math.round((42 - ratingColor[2]) * 0.85))
  );
  doc.circle(scoreX, scoreY, scoreR - 1, 'F');

  // Score number
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...ratingColor);
  doc.text(String(data.overallScore), scoreX, scoreY + 2, { align: 'center' });

  // Rating label
  doc.setFontSize(9);
  doc.setTextColor(...ratingColor);
  doc.text(getRatingLabel(data.overallScore), scoreX, scoreY + scoreR + 6, { align: 'center' });

  // --- 4-column score breakdown ---
  const categories = [
    { label: 'Technical', value: data.scores.technical },
    { label: 'Coding', value: data.scores.coding },
    { label: 'Communication', value: data.scores.communication },
    { label: 'Problem Solving', value: data.scores.problemSolving },
  ];
  const colWidth = 50;
  const startX = W / 2 - (colWidth * 4) / 2;
  const barY = 130;

  categories.forEach((cat, i) => {
    const cx = startX + colWidth * i + colWidth / 2;
    const catColor = getRatingColor(cat.value);

    // Score value
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...catColor);
    doc.text(String(cat.value), cx, barY, { align: 'center' });

    // Label
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(cat.label, cx, barY + 6, { align: 'center' });

    // Small bar background
    const barW = 30;
    const barH = 2.5;
    doc.setFillColor(51, 65, 85); // slate-700
    doc.roundedRect(cx - barW / 2, barY + 8, barW, barH, 1, 1, 'F');

    // Small bar fill
    const fillW = (barW * cat.value) / 100;
    doc.setFillColor(...catColor);
    doc.roundedRect(cx - barW / 2, barY + 8, fillW, barH, 1, 1, 'F');
  });

  // --- Key Strengths ---
  const strengthsY = 150;
  if (data.strengths.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text('KEY STRENGTHS', W / 2, strengthsY, { align: 'center' });

    const maxStrengths = data.strengths.slice(0, 4);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225); // slate-300

    maxStrengths.forEach((s, i) => {
      const truncated = s.length > 80 ? s.substring(0, 77) + '...' : s;
      const sy = strengthsY + 6 + i * 5;
      doc.text(`\u2022  ${truncated}`, W / 2, sy, { align: 'center' });
    });
  }

  // --- Date and Session Ref ---
  const footerY = H - 28;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Date: ${data.date}`, 24, footerY);
  doc.text(`Session Ref: ${data.sessionId.substring(0, 8).toUpperCase()}`, W - 24, footerY, { align: 'right' });

  // --- Footer ---
  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(24, footerY + 4, W - 24, footerY + 4);

  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('DevProof  |  AI-Powered Technical Interview Platform', W / 2, footerY + 9, { align: 'center' });

  // --- Save ---
  const shortId = data.sessionId.substring(0, 8);
  doc.save(`DevProof-Certificate-${shortId}.pdf`);
}
