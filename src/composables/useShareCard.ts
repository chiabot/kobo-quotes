import { useQuotesStore, type Quote, COLOR_MAP } from '@/stores/quotes'

const CARD_W = 1080
const CARD_H = 1350
const PAD = 80
const TEXT_AREA = CARD_W - PAD * 2

// ── Helpers ────────────────────────────────────────────────
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  font: string,
): string[] {
  ctx.font = font
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Card generator ─────────────────────────────────────────
export function useShareCard() {
  const store = useQuotesStore()

  async function generateCard(quote: Quote): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = CARD_W
    canvas.height = CARD_H
    const ctx = canvas.getContext('2d')!

    const accentColor = COLOR_MAP[String(quote.color)] ?? '#a8a29e'

    // ── Background ──────────────────────────────────────
    ctx.fillStyle = '#fafaf9'
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    // Blurred cover in top region
    const coverB64 = store.getCachedCover(quote.volumeId)
    if (coverB64) {
      try {
        const coverImg = await loadImage(coverB64)
        ctx.save()
        ctx.filter = 'blur(40px)'
        ctx.globalAlpha = 0.12
        ctx.drawImage(coverImg, -40, -40, CARD_W + 80, CARD_H + 80)
        ctx.restore()
      } catch { /* cover load failed, skip */ }
    }

    // ── Inner card ──────────────────────────────────────
    const cardX = 40, cardY = 40
    const cardW = CARD_W - 80, cardH = CARD_H - 80

    ctx.save()
    roundRect(ctx, cardX, cardY, cardW, cardH, 32)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fill()
    ctx.restore()

    // Accent bar (left edge of inner card)
    roundRect(ctx, cardX, cardY, 6, cardH, 3)
    ctx.fillStyle = accentColor
    ctx.fill()

    // ── Cover thumbnail ─────────────────────────────────
    let contentY = cardY + PAD
    if (coverB64) {
      try {
        const coverImg = await loadImage(coverB64)
        const thumbH = 160
        const thumbW = Math.round(thumbH * (coverImg.width / coverImg.height))
        const thumbX = cardX + PAD
        ctx.save()
        roundRect(ctx, thumbX, contentY, thumbW, thumbH, 8)
        ctx.clip()
        ctx.drawImage(coverImg, thumbX, contentY, thumbW, thumbH)
        ctx.restore()

        // Book title next to cover
        ctx.fillStyle = '#78716c'
        ctx.font = '600 28px "DM Sans", sans-serif'
        const titleLines = wrapText(ctx, quote.book, TEXT_AREA - thumbW - 40, ctx.font)
        titleLines.forEach((line, i) => {
          ctx.fillText(line, thumbX + thumbW + 28, contentY + 36 + i * 36)
        })

        // Author under title
        if (quote.author) {
          ctx.fillStyle = '#a8a29e'
          ctx.font = 'italic 24px "DM Sans", sans-serif'
          ctx.fillText(quote.author, thumbX + thumbW + 28, contentY + 36 + titleLines.length * 36 + 8)
        }

        contentY += thumbH + 50
      } catch {
        contentY += 20
      }
    } else {
      // No cover: just book title
      ctx.fillStyle = '#78716c'
      ctx.font = '600 28px "DM Sans", sans-serif'
      const titleLines = wrapText(ctx, quote.book, TEXT_AREA - 20, ctx.font)
      titleLines.forEach((line, i) => {
        ctx.fillText(line, cardX + PAD, contentY + 32 + i * 36)
      })
      if (quote.author) {
        ctx.fillStyle = '#a8a29e'
        ctx.font = 'italic 24px "DM Sans", sans-serif'
        ctx.fillText(quote.author, cardX + PAD, contentY + 32 + titleLines.length * 36 + 8)
      }
      contentY += 32 + titleLines.length * 36 + (quote.author ? 40 : 20) + 30
    }

    // ── Divider ─────────────────────────────────────────
    ctx.fillStyle = '#e7e5e4'
    ctx.fillRect(cardX + PAD, contentY, cardW - PAD * 2, 1)
    contentY += 40

    // ── Quote mark ──────────────────────────────────────
    ctx.fillStyle = accentColor
    ctx.globalAlpha = 0.3
    ctx.font = '160px Georgia, serif'
    ctx.fillText('\u201C', cardX + PAD - 14, contentY + 100)
    ctx.globalAlpha = 1

    // ── Quote text ──────────────────────────────────────
    const quoteFont = 'italic 36px "Lora", serif'
    const quoteLines = wrapText(ctx, quote.text, TEXT_AREA - 40, quoteFont)
    const lineHeight = 54
    const maxLines = 16
    const visibleLines = quoteLines.slice(0, maxLines)
    const truncated = quoteLines.length > maxLines

    ctx.fillStyle = '#1c1917'
    ctx.font = quoteFont
    visibleLines.forEach((line, i) => {
      let display = line
      if (truncated && i === visibleLines.length - 1) {
        display = line.replace(/\s*\S+$/, '') + ' …'
      }
      ctx.fillText(display, cardX + PAD + 16, contentY + 50 + i * lineHeight)
    })

    contentY += 50 + visibleLines.length * lineHeight + 20

    // ── Attached image ──────────────────────────────────
    if (quote.attachedImage) {
      const imgB64 = store.getCachedImage(quote.attachedImage)
      if (imgB64) {
        try {
          const attachedImg = await loadImage(imgB64)
          const maxImgH = Math.min(300, CARD_H - contentY - 140)
          if (maxImgH > 80) {
            const imgAspect = attachedImg.width / attachedImg.height
            const imgW = Math.min(cardW - PAD * 2, maxImgH * imgAspect)
            const imgH = imgW / imgAspect
            const imgX = cardX + (cardW - imgW) / 2

            ctx.save()
            roundRect(ctx, imgX, contentY, imgW, imgH, 12)
            ctx.clip()
            ctx.drawImage(attachedImg, imgX, contentY, imgW, imgH)
            ctx.restore()

            contentY += imgH + 20
          }
        } catch { /* image load failed, skip */ }
      }
    }

    // ── Progress bar ────────────────────────────────────
    if (quote.bookProgress && quote.bookProgress > 0) {
      const barY = CARD_H - 100
      const barX = cardX + PAD
      const barW = cardW - PAD * 2
      const barH = 6

      // Track
      roundRect(ctx, barX, barY, barW, barH, 3)
      ctx.fillStyle = '#e7e5e4'
      ctx.fill()

      // Fill
      const fillW = barW * (quote.bookProgress / 100)
      roundRect(ctx, barX, barY, fillW, barH, 3)
      ctx.fillStyle = accentColor
      ctx.fill()

      // Percentage label
      ctx.fillStyle = '#a8a29e'
      ctx.font = '22px "DM Sans", sans-serif'
      ctx.fillText(`${quote.bookProgress}%`, barX + fillW + 12, barY + 6)
    }

    // ── Watermark ───────────────────────────────────────
    ctx.fillStyle = '#d6d3d1'
    ctx.font = '20px "DM Sans", sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('kobo quotes', CARD_W - cardX - PAD, CARD_H - cardY - 36)
    ctx.textAlign = 'left'

    // ── Export ───────────────────────────────────────────
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('toBlob failed')),
        'image/png',
      )
    })
  }

  async function shareQuote(quote: Quote) {
    try {
      const blob = await generateCard(quote)
      const file = new File([blob], `quote-${quote.bookmarkId.slice(0, 8)}.png`, {
        type: 'image/png',
      })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `"${quote.text.slice(0, 100)}${quote.text.length > 100 ? '…' : ''}"\n— ${quote.book}`,
        })
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      // User cancelled share sheet — not an error
      if (e?.name !== 'AbortError') {
        console.error('Share failed', e)
      }
    }
  }

  return { generateCard, shareQuote }
}
