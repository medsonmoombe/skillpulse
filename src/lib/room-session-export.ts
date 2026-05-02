import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { sendAppEmail } from "@/lib/mailer";

type RoomSessionEmailInput = {
  roomTitle: string;
  hostName: string;
  participantName: string;
  participantEmail: string;
  endedAt: Date;
  boardImageDataUrl?: string | null;
  boardSummary: {
    totalElements: number;
    textSnippets: string[];
    shapeCount: number;
  };
};

type PlainObject = Record<string, unknown>;

function wrapLine(text: string, maxLength = 88) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [text];
}

function extractPngBytes(dataUrl: string) {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

async function createSessionPdf(input: RoomSessionEmailInput) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const imagePage = pdf.addPage([595.28, 841.89]);
  const { width: pageWidth, height: pageHeight } = imagePage.getSize();
  const margin = 40;

  imagePage.drawText("SkillPulse Session Board Summary", {
    x: margin,
    y: pageHeight - margin,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.16),
  });

  const metaLines = [
    `Session: ${input.roomTitle}`,
    `Host: ${input.hostName}`,
    `Participant: ${input.participantName}`,
    `Ended at: ${input.endedAt.toLocaleString()}`,
  ];

  metaLines.forEach((line, index) => {
    imagePage.drawText(line, {
      x: margin,
      y: pageHeight - margin - 34 - index * 18,
      size: 11,
      font,
      color: rgb(0.2, 0.23, 0.29),
    });
  });

  const pngBytes = input.boardImageDataUrl ? extractPngBytes(input.boardImageDataUrl) : null;
  if (pngBytes) {
    try {
      const image = await pdf.embedPng(pngBytes);
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - 210;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (pageWidth - width) / 2;
      const y = 110;

      imagePage.drawImage(image, { x, y, width, height });
    } catch {
      imagePage.drawText("Board snapshot could not be embedded, but the session summary is included on the next page.", {
        x: margin,
        y: pageHeight - 150,
        size: 11,
        font,
        color: rgb(0.7, 0.2, 0.2),
        maxWidth: pageWidth - margin * 2,
      });
    }
  } else {
    imagePage.drawText("No board snapshot was captured for this session. The summary is included on the next page.", {
      x: margin,
      y: pageHeight - 150,
      size: 11,
      font,
      color: rgb(0.7, 0.2, 0.2),
      maxWidth: pageWidth - margin * 2,
    });
  }

  const summaryPage = pdf.addPage([595.28, 841.89]);
  const summaryLines = [
    "Session Summary",
    "",
    `Main board elements: ${input.boardSummary.totalElements}`,
    `Shape elements: ${input.boardSummary.shapeCount}`,
    `Captured text notes: ${input.boardSummary.textSnippets.length}`,
    "",
    ...(input.boardSummary.textSnippets.length
      ? input.boardSummary.textSnippets.map((snippet, index) => `- Note ${index + 1}: ${snippet}`)
      : ["- No text notes were written on the main board during this session."]),
  ].flatMap((line) => wrapLine(line, 80));

  summaryPage.drawText("SkillPulse Session Notes", {
    x: margin,
    y: pageHeight - margin,
    size: 18,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.16),
  });

  let y = pageHeight - margin - 28;
  for (const line of summaryLines.slice(0, 90)) {
    summaryPage.drawText(line, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.18, 0.2, 0.24),
      maxWidth: pageWidth - margin * 2,
    });
    y -= 15;
    if (y < 50) break;
  }

  return Buffer.from(await pdf.save());
}

export function extractBoardSummary(storageDocument: unknown) {
  const root = (storageDocument ?? {}) as PlainObject;
  const excalidrawState = (root.excalidrawState ?? {}) as PlainObject;
  const elements = Array.isArray(excalidrawState.elements) ? excalidrawState.elements : [];

  const textSnippets = elements
    .filter((element): element is PlainObject => Boolean(element && typeof element === "object"))
    .filter((element) => element.type === "text" && typeof element.text === "string")
    .map((element) => String(element.text).trim())
    .filter(Boolean)
    .slice(0, 20);

  return {
    totalElements: elements.length,
    textSnippets,
    shapeCount: Math.max(elements.length - textSnippets.length, 0),
  };
}

async function sendWithNodemailer(input: RoomSessionEmailInput, attachment: Buffer) {
  const lines = [
    `SkillPulse live session recap`,
    ``,
    `Hello ${input.participantName},`,
    ``,
    `${input.hostName} ended the session "${input.roomTitle}".`,
    `We've attached a PDF summary of the main board for your reference.`,
    ``,
    `Ended at: ${input.endedAt.toLocaleString()}`,
    `Board elements: ${input.boardSummary.totalElements}`,
    `Text notes captured: ${input.boardSummary.textSnippets.length}`,
  ];

  return sendAppEmail({
    to: input.participantEmail,
    subject: `Board recap: ${input.roomTitle}`,
    text: lines.join("\n"),
    attachments: [
      {
        filename: `${input.roomTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "session"}-board-summary.pdf`,
        content: attachment,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function emailRoomBoardSummary(input: RoomSessionEmailInput) {
  const pdf = await createSessionPdf(input);

  return sendWithNodemailer(input, pdf);
}
