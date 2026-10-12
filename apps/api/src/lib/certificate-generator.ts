import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export interface CertificateData {
  holderName: string;
  courseTitle: string;
  orgName: string;
  certificateNumber: string;
  issuedAt: Date;
  verificationUrl: string;
}

export function generateCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        info: {
          Title: `Certificate - ${data.courseTitle}`,
          Author: data.orgName,
          Subject: `Certificate of Completion for ${data.holderName}`,
          Keywords: 'LearnStack, Certificate, Completion',
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;

      // Background color
      doc.rect(0, 0, width, height).fill('#FAFBFC');

      // Outer Decorative Border (Navy)
      doc
        .lineWidth(6)
        .strokeColor('#0A1628')
        .rect(20, 20, width - 40, height - 40)
        .stroke();

      // Inner Accent Border (Teal)
      doc
        .lineWidth(1.5)
        .strokeColor('#14B8A6')
        .rect(28, 28, width - 56, height - 56)
        .stroke();

      // Corner Accents
      const cornerSize = 16;
      doc.strokeColor('#0A1628').lineWidth(2);
      // Top-Left
      doc.moveTo(34, 34 + cornerSize).lineTo(34, 34).lineTo(34 + cornerSize, 34).stroke();
      // Top-Right
      doc.moveTo(width - 34 - cornerSize, 34).lineTo(width - 34, 34).lineTo(width - 34, 34 + cornerSize).stroke();
      // Bottom-Left
      doc.moveTo(34, height - 34 - cornerSize).lineTo(34, height - 34).lineTo(34 + cornerSize, height - 34).stroke();
      // Bottom-Right
      doc.moveTo(width - 34 - cornerSize, height - 34).lineTo(width - 34, height - 34).lineTo(width - 34, height - 34 - cornerSize).stroke();

      // Top Organization Name Banner
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#14B8A6')
        .text(data.orgName.toUpperCase(), 0, 65, {
          align: 'center',
          characterSpacing: 3,
        });

      // Main Heading
      doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor('#0A1628')
        .text('CERTIFICATE OF COMPLETION', 0, 110, {
          align: 'center',
          characterSpacing: 2,
        });

      // Sub-heading
      doc
        .font('Helvetica')
        .fontSize(13)
        .fillColor('#64748B')
        .text('THIS IS PROUDLY PRESENTED TO', 0, 160, {
          align: 'center',
          characterSpacing: 1.5,
        });

      // Recipient Name
      doc
        .font('Helvetica-Bold')
        .fontSize(32)
        .fillColor('#0A1628')
        .text(data.holderName, 0, 195, {
          align: 'center',
        });

      // Underline / Divider below recipient
      const nameWidth = Math.min(width - 240, 420);
      const startX = (width - nameWidth) / 2;
      doc
        .lineWidth(2)
        .strokeColor('#14B8A6')
        .moveTo(startX, 240)
        .lineTo(startX + nameWidth, 240)
        .stroke();

      // Completion text
      doc
        .font('Helvetica')
        .fontSize(13)
        .fillColor('#475569')
        .text('for successfully completing all curriculum modules, practical exercises, and assessments in', 0, 260, {
          align: 'center',
        });

      // Course Title
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#0A1628')
        .text(data.courseTitle, 60, 290, {
          align: 'center',
          width: width - 120,
        });

      // Golden / Teal Ribbon / Seal icon representation
      const sealY = 370;
      doc.circle(width / 2, sealY, 26).fillAndStroke('#F0FDFA', '#14B8A6');
      doc.circle(width / 2, sealY, 20).stroke('#14B8A6');
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#0F766E')
        .text('VERIFIED', width / 2 - 25, sealY - 5, {
          width: 50,
          align: 'center',
        });

      // Bottom Row: Date, Verification Info, Signature Line
      const footerY = 460;

      // Left Column: Issue Date
      const dateFormatted = data.issuedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#0A1628')
        .text(dateFormatted, 60, footerY, { width: 220, align: 'center' });
      doc
        .lineWidth(1)
        .strokeColor('#CBD5E1')
        .moveTo(60, footerY + 20)
        .lineTo(280, footerY + 20)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748B')
        .text('Date Issued', 60, footerY + 25, { width: 220, align: 'center' });

      // Right Column: Verified Organization Issuer
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#0A1628')
        .text(data.orgName, width - 280, footerY, { width: 220, align: 'center' });
      doc
        .lineWidth(1)
        .strokeColor('#CBD5E1')
        .moveTo(width - 280, footerY + 20)
        .lineTo(width - 60, footerY + 20)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#64748B')
        .text('Authorized Learning Organization', width - 280, footerY + 25, { width: 220, align: 'center' });

      // Bottom Center: Certificate ID & Public Verification URL
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0A1628')
        .text(`Certificate ID: ${data.certificateNumber}`, 0, 520, {
          align: 'center',
        });

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#64748B')
        .text(`Verify online at: ${data.verificationUrl}`, 0, 535, {
          align: 'center',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
