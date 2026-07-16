import { useQuotesStore, type Quote, COLOR_MAP } from "@/stores/quotes";

const W = 1080;
const PAD = 90;
const R = 40;
const MAX_LINES = 18;
const LINE_HEIGHT = 54;
const QUOTE_FONT = "italic 40px Georgia, serif";
const TITLE_FONT = '500 28px "Helvetica Neue", sans-serif';
const AUTHOR_FONT = 'italic 24px "Helvetica Neue", sans-serif';
const WATERMARK_FONT = '18px "Helvetica Neue", sans-serif';
const COVER_W = 140;
const COVER_H = 200;

// ── Helpers ────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function rrectTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Card generator ─────────────────────────────────────────
export function useShareCard() {
  const store = useQuotesStore();

  async function generateCard(quote: Quote): Promise<Blob> {
    const accentColor = COLOR_MAP[String(quote.color)] ?? "#a8a29e";

    // Use an offscreen canvas to measure text and compute dynamic height
    const measure = document.createElement("canvas");
    measure.width = W;
    measure.height = 100;
    const mctx = measure.getContext("2d")!;

    // ── Measure all text to compute total height ────────
    const coverX = PAD;
    const coverY = 90;
    const metaX = coverX + COVER_W + 28;
    const metaMaxW = W - PAD - metaX;
    const quoteX = PAD + 24;
    const quoteMaxW = W - PAD - quoteX - 10;
    const barTop = coverY + COVER_H + 50;

    // Measure title lines
    mctx.font = TITLE_FONT;
    const titleLines = wrapText(mctx, quote.book, metaMaxW);

    // Measure quote lines
    mctx.font = QUOTE_FONT;
    const allQuoteLines = wrapText(
      mctx,
      `\u201C${quote.text}\u201D`,
      quoteMaxW,
    );
    const truncated = allQuoteLines.length > MAX_LINES;
    const visibleLines = allQuoteLines.slice(0, MAX_LINES);

    // Compute dynamic height
    const textBottom =
      barTop + 40 + (visibleLines.length - 1) * LINE_HEIGHT + 16;
    const watermarkY = textBottom + 60;
    const totalH = watermarkY + 50;

    // ── Draw on final canvas ────────────────────────────
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d")!;

    // Background with rounded top
    rrectTop(ctx, 0, 0, W, totalH, R);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Top color bar (matches modal border-top)
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, R, W, 6);
    rrectTop(ctx, 0, 0, W, R + 6, R);
    ctx.fillStyle = accentColor;
    ctx.fill();

    // ── Cover thumbnail ─────────────────────────────────
    const coverB64 = store.getCachedCover(quote.volumeId);
    if (coverB64) {
      try {
        const coverImg = await loadImage(coverB64);
        ctx.save();
        rrect(ctx, coverX, coverY, COVER_W, COVER_H, 8);
        ctx.clip();
        ctx.drawImage(coverImg, coverX, coverY, COVER_W, COVER_H);
        ctx.restore();
      } catch {
        // Draw placeholder
        ctx.save();
        rrect(ctx, coverX, coverY, COVER_W, COVER_H, 8);
        ctx.fillStyle = "#f5f5f4";
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.save();
      rrect(ctx, coverX, coverY, COVER_W, COVER_H, 8);
      ctx.fillStyle = "#f5f5f4";
      ctx.fill();
      ctx.restore();
    }

    // Cover border
    ctx.save();
    rrect(ctx, coverX, coverY, COVER_W, COVER_H, 8);
    ctx.strokeStyle = "#e7e5e4";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── Book title + author ─────────────────────────────
    ctx.font = TITLE_FONT;
    ctx.fillStyle = "#44403c";
    titleLines.forEach((line, i) => {
      ctx.fillText(line, metaX, coverY + 36 + i * 34);
    });

    if (quote.author) {
      ctx.font = AUTHOR_FONT;
      ctx.fillStyle = "#a8a29e";
      ctx.fillText(
        quote.author,
        metaX,
        coverY + 36 + titleLines.length * 34 + 12,
      );
    }

    // ── Quote text ──────────────────────────────────────
    ctx.font = QUOTE_FONT;
    ctx.fillStyle = "#44403c";
    let y = barTop + 40;
    visibleLines.forEach((line, i) => {
      let display = line;
      if (truncated && i === visibleLines.length - 1) {
        display = line.replace(/\s*\S+$/, "") + " \u2026";
      }
      ctx.fillText(display, quoteX, y + i * LINE_HEIGHT);
    });

    // ── Grey left bar alongside quote ───────────────────
    ctx.fillStyle = "#e7e5e4";
    ctx.fillRect(PAD, barTop, 3, textBottom - barTop);

    // ── Watermark ───────────────────────────────────────
    ctx.font = WATERMARK_FONT;
    ctx.fillStyle = "#d6d3d1";
    ctx.textAlign = "right";
    ctx.fillText("kobo quotes", W - PAD, watermarkY);
    ctx.textAlign = "left";

    // ── Export ───────────────────────────────────────────
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/png",
      );
    });
  }

  async function shareQuote(quote: Quote) {
    try {
      const blob = await generateCard(quote);
      const file = new File(
        [blob],
        `quote-${quote.bookmarkId.slice(0, 8)}.png`,
        {
          type: "image/png",
        },
      );

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `\u201C${quote.text.slice(0, 100)}${quote.text.length > 100 ? "\u2026" : ""}\u201D\n\u2014 ${quote.book}`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        console.error("Share failed", e);
      }
    }
  }

  return { generateCard, shareQuote };
}
