import { format } from 'date-fns'

function buildReceiptHTML(data) {
  const { buyer_name, buyer_phone, books, total_price, sold_at, sold_by_name } = data
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')

  const bookRows = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `<div style="display:flex;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f0f0f0">
      <span style="font-size:11px;color:#bbb;width:22px;flex-shrink:0;padding-top:1px">${i + 1}.</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.35">${b.title}</div>
        ${lvl ? `<div style="font-size:10px;color:#aaa;margin-top:2px">${lvl}</div>` : ''}
      </div>
      <span style="font-size:12px;font-weight:700;color:#555;padding-left:16px;flex-shrink:0;padding-top:1px">×${b.qty || 1}</span>
    </div>`
  }).join('')

  const ruler = `<div style="display:flex;align-items:center;gap:6px;margin:20px 0">
    <div style="flex:1;border-top:1.5px dashed #d8d8d8"></div>
    <div style="width:6px;height:6px;border:1.5px solid #d0d0d0;border-radius:50%;flex-shrink:0"></div>
    <div style="flex:1;border-top:1.5px dashed #d8d8d8"></div>
  </div>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Purchase Receipt — Champion Square</title>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 210mm; height: 297mm; background: #fff; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div style="width:210mm;min-height:297mm;display:flex;flex-direction:column;background:#fff">

  <!-- Header -->
  <div style="background:#bd0a0a;padding:30px 48px 26px;text-align:center">
    <div style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.4px">Champion Square Notes</div>
    <div style="display:inline-block;margin-top:14px;border:1.5px solid rgba(255,255,255,0.4);color:#fff;font-size:10px;font-weight:700;letter-spacing:3px;padding:5px 18px;border-radius:4px;background:rgba(255,255,255,0.1)">PURCHASE RECEIPT</div>
  </div>

  <!-- Body -->
  <div style="padding:36px 48px 0;flex:1">

    <!-- Transaction details -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:0">
      <tr>
        <td style="padding:6px 0;color:#999;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;width:120px;vertical-align:top">Date</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${date}</td>
      </tr>
      ${sold_by_name ? `<tr>
        <td style="padding:6px 0;color:#999;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;vertical-align:top">Issued By</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${sold_by_name}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:6px 0;color:#999;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;vertical-align:top">Buyer Name</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${buyer_name}</td>
      </tr>
      ${buyer_phone ? `<tr>
        <td style="padding:6px 0;color:#999;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;vertical-align:top">Phone</td>
        <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a1a1a">${buyer_phone}</td>
      </tr>` : ''}
    </table>

    ${ruler}

    <!-- Books -->
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#bd0a0a;margin-bottom:4px">Books Purchased</div>
    <div>
      ${bookRows}
    </div>

    <!-- Double rule + total -->
    <div style="border-top:2px solid #1a1a1a;margin-top:16px"></div>
    ${total_price ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
      <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888">Total Amount</span>
      <span style="font-size:26px;font-weight:800;color:#bd0a0a">₹${total_price}</span>
    </div>
    <div style="border-top:2px solid #1a1a1a"></div>` : ''}

  </div>

  <!-- Footer -->
  <div style="padding:28px 48px 36px;text-align:center">
    ${ruler}
    <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:6px">Thank you for your purchase!</div>
    <div style="font-size:10px;color:#aaa;margin-bottom:6px">For queries, contact Champion Square.</div>
    <div style="font-size:10px;font-weight:700;color:#bd0a0a;letter-spacing:1px">Excellence · Experience · Trust</div>
  </div>

</div>
</body>
</html>`
}

export function buildWhatsAppText(data) {
  const { buyer_name, buyer_phone, books, total_price, sold_at, sold_by_name } = data
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookLines = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `${i + 1}. ${b.title}${lvl ? ` (${lvl})` : ''} × ${b.qty || 1}`
  }).join('\n')
  return [
    '*Champion Square — Purchase Receipt*',
    '',
    `📅 Date: ${date}`,
    '',
    '*Buyer Details*',
    `Buyer Name: ${buyer_name}`,
    buyer_phone ? `Phone: ${buyer_phone}` : null,
    sold_by_name ? `Issued by: ${sold_by_name}` : null,
    '',
    '*Books Purchased*',
    bookLines,
    '',
    total_price ? `*Total Amount: ₹${total_price}*` : null,
    '',
    'Thank you for your purchase! 🙏\n— Champion Square',
  ].filter(l => l !== null).join('\n')
}

export function printReceipt(data) {
  const html = buildReceiptHTML(data)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html.replace('</body>', '<script>window.onload=function(){window.print()}<\/script></body>'))
  win.document.close()
}

export async function generateReceiptBlob(data) {
  const html = buildReceiptHTML(data)

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:auto;border:none;visibility:hidden'
  document.body.appendChild(iframe)

  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()

  await new Promise(resolve => setTimeout(resolve, 600))

  // Measure actual rendered height so long receipts aren't cut off
  const contentHeight = Math.max(
    iframe.contentDocument.documentElement.scrollHeight,
    iframe.contentDocument.body.scrollHeight,
    1123
  )
  iframe.style.height = contentHeight + 'px'

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const SCALE = 2
  const A4_W_PX = 794
  const A4_H_PX = 1123

  const canvas = await html2canvas(iframe.contentDocument.body, {
    scale: SCALE,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: A4_W_PX,
    windowHeight: contentHeight,
    width: A4_W_PX,
    height: contentHeight,
  })
  document.body.removeChild(iframe)

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const totalPages = Math.ceil(contentHeight / A4_H_PX)

  for (let page = 0; page < totalPages; page++) {
    const srcY = page * A4_H_PX * SCALE
    const srcH = Math.min(A4_H_PX * SCALE, canvas.height - srcY)

    // Slice this page out of the full canvas
    const slice = document.createElement('canvas')
    slice.width = A4_W_PX * SCALE
    slice.height = A4_H_PX * SCALE
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, srcY, A4_W_PX * SCALE, srcH, 0, 0, A4_W_PX * SCALE, srcH)

    if (page > 0) pdf.addPage()
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
  }

  return pdf.output('blob')
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Champion-Square-Receipt.pdf'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function shareReceiptPDF(blob) {
  const file = new File([blob], 'Champion-Square-Receipt.pdf', { type: 'application/pdf' })
  try {
    if (navigator.share) {
      await navigator.share({ files: [file], title: 'Purchase Receipt — Champion Square' })
    } else {
      downloadBlob(blob)
    }
  } catch (e) {
    if (e?.name !== 'AbortError') downloadBlob(blob)
  }
}
