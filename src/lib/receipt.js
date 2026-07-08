import { format } from 'date-fns'

const L = {
  en: {
    brand: 'Champion Square',
    sub: 'IAS Preparation Materials',
    receipt: 'PURCHASE RECEIPT',
    date: 'Date',
    buyer: 'Buyer Name',
    phone: 'Phone',
    seller: 'Issued By',
    books: 'Books Purchased',
    qty: 'Qty',
    total: 'Total Amount',
    thank: 'Thank you for your purchase!',
    contact: 'For queries, contact Champion Square.',
    tagline: 'Excellence · Experience · Trust',
    waHeader: '*Champion Square — Purchase Receipt*',
    waBuyer: '*Buyer Details*',
    waSeller: 'Issued by',
    waBooks: '*Books Purchased*',
    waTotal: '*Total Amount*',
    waThank: 'Thank you for your purchase! 🙏\n— Champion Square',
  },
  hi: {
    brand: 'चैंपियन स्क्वेयर',
    sub: 'IAS परीक्षा सामग्री',
    receipt: 'क्रय रसीद',
    date: 'दिनांक',
    buyer: 'खरीदार का नाम',
    phone: 'फोन नंबर',
    seller: 'जारीकर्ता',
    books: 'खरीदी गई पुस्तकें',
    qty: 'संख्या',
    total: 'कुल राशि',
    thank: 'खरीदारी के लिए आपका धन्यवाद!',
    contact: 'किसी भी जानकारी के लिए चैंपियन स्क्वेयर से संपर्क करें।',
    tagline: 'सटीकता · अनुभव · भरोसा',
    waHeader: '*चैंपियन स्क्वेयर — क्रय रसीद*',
    waBuyer: '*खरीदार का विवरण*',
    waSeller: 'जारीकर्ता',
    waBooks: '*खरीदी गई पुस्तकें*',
    waTotal: '*कुल राशि*',
    waThank: 'खरीदारी के लिए आपका धन्यवाद! 🙏\n— चैंपियन स्क्वेयर',
  }
}

function getLang(data) {
  if (data.medium === 'english') return L.en
  if (data.medium === 'hindi') return L.hi
  const devanagari = /[ऀ-ॿ]/
  const titles = (data.books || []).map(b => b.title || '').join(' ')
  return devanagari.test(titles) ? L.hi : L.en
}

function buildReceiptHTML(data) {
  const { buyer_name, buyer_phone, books, total_price, sold_at, sold_by_name } = data
  const lbl = getLang(data)
  const isHindi = lbl === L.hi
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')

  const bookRows = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `<tr>
      <td class="book-num">${i + 1}.</td>
      <td>
        <div class="book-title">${b.title}</div>
        ${lvl ? `<div class="book-meta">${lvl}</div>` : ''}
      </td>
      <td class="book-qty">${b.qty || 1}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="${isHindi ? 'hi' : 'en'}">
<head>
  <title>${lbl.receipt} — ${lbl.brand}</title>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${isHindi ? "'Noto Sans Devanagari', 'Mangal'," : ""} 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #1a1a1a;
      font-size: 13px;
    }
    .page { max-width: 440px; margin: 0 auto; }

    .header {
      background: #bd0a0a;
      padding: 22px 28px 18px;
      text-align: center;
    }
    .brand { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 3px; letter-spacing: 0.4px; }
    .receipt-badge {
      display: inline-block; margin-top: 12px;
      background: rgba(255,255,255,0.18); color: #fff;
      font-size: 10px; font-weight: 700; letter-spacing: 2px;
      padding: 4px 14px; border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.35);
    }

    .content { padding: 22px 28px; }

    .meta-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
      padding-bottom: 16px; border-bottom: 1px dashed #e8e8e8;
      margin-bottom: 16px;
    }
    .meta-item.full { grid-column: 1 / -1; }
    .meta-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #bd0a0a; margin-bottom: 3px;
    }
    .meta-value { font-size: 13px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
    .meta-sub { font-size: 11px; color: #666; margin-top: 2px; }

    .books-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 1px; color: #bd0a0a; margin-bottom: 8px;
    }
    table.books { width: 100%; border-collapse: collapse; }
    table.books th {
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px;
      color: #aaa; font-weight: 600; padding: 0 0 7px;
      border-bottom: 1.5px solid #eee; text-align: left;
    }
    table.books th:last-child { text-align: right; }
    table.books td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #f5f5f5; }
    table.books tr:last-child td { border-bottom: none; }
    .book-num { width: 22px; color: #ccc; font-size: 11px; padding-top: 1px; }
    .book-title { font-weight: 600; color: #1a1a1a; line-height: 1.35; font-size: 12.5px; }
    .book-meta { font-size: 10px; color: #999; margin-top: 2px; }
    .book-qty { text-align: right; font-weight: 700; color: #444; padding-left: 12px; white-space: nowrap; }

    .total-box {
      background: #fdf2f2; border: 1.5px solid #f0c8c8; border-radius: 10px;
      padding: 13px 18px; margin-top: 16px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; }
    .total-value { font-size: 22px; font-weight: 800; color: #bd0a0a; }

    .footer {
      margin-top: 22px; padding-top: 14px;
      border-top: 1px solid #f0f0f0; text-align: center;
    }
    .thank-you { font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 5px; }
    .footer-sub { font-size: 10px; color: #aaa; line-height: 1.7; }
    .tagline { margin-top: 6px; font-size: 10px; color: #bd0a0a; font-weight: 600; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">${lbl.brand}</div>
    <div class="brand-sub">${lbl.sub}</div>
    <div class="receipt-badge">${lbl.receipt}</div>
  </div>

  <div class="content">
    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">${lbl.date}</div>
        <div class="meta-value" style="font-size:12px">${date}</div>
      </div>
      ${sold_by_name ? `<div class="meta-item">
        <div class="meta-label">${lbl.seller}</div>
        <div class="meta-value">${sold_by_name}</div>
      </div>` : '<div class="meta-item"></div>'}
      <div class="meta-item full">
        <div class="meta-label">${lbl.buyer}</div>
        <div class="meta-value">${buyer_name}</div>
        ${buyer_phone ? `<div class="meta-sub">${buyer_phone}</div>` : ''}
      </div>
    </div>

    <div class="books-label">${lbl.books}</div>
    <table class="books">
      <thead>
        <tr>
          <th style="width:22px"></th>
          <th>${lbl.books}</th>
          <th>${lbl.qty}</th>
        </tr>
      </thead>
      <tbody>${bookRows}</tbody>
    </table>

    ${total_price ? `<div class="total-box">
      <span class="total-label">${lbl.total}</span>
      <span class="total-value">₹${total_price}</span>
    </div>` : ''}

    <div class="footer">
      <div class="thank-you">${lbl.thank}</div>
      <div class="footer-sub">${lbl.contact}</div>
      <div class="tagline">${lbl.tagline}</div>
    </div>
  </div>
</div>
</body>
</html>`
}

export function buildWhatsAppText(data) {
  const { buyer_name, buyer_phone, books, total_price, sold_at, sold_by_name } = data
  const lbl = getLang(data)
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookLines = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `${i + 1}. ${b.title}${lvl ? ` (${lvl})` : ''} × ${b.qty || 1}`
  }).join('\n')
  return [
    lbl.waHeader,
    '',
    `📅 ${lbl.date}: ${date}`,
    '',
    lbl.waBuyer,
    `${lbl.buyer}: ${buyer_name}`,
    buyer_phone ? `${lbl.phone}: ${buyer_phone}` : null,
    sold_by_name ? `${lbl.waSeller}: ${sold_by_name}` : null,
    '',
    lbl.waBooks,
    bookLines,
    '',
    total_price ? `${lbl.waTotal}: ₹${total_price}` : null,
    '',
    lbl.waThank,
  ].filter(l => l !== null).join('\n')
}

export function printReceipt(data) {
  const html = buildReceiptHTML(data)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html.replace('</body>', '<script>window.onload=function(){window.print()}<\/script></body>'))
  win.document.close()
}

export async function shareReceiptPDF(data) {
  const html = buildReceiptHTML(data)

  // Render in a hidden iframe so all styles apply correctly
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:500px;height:100px;border:none;visibility:hidden'
  document.body.appendChild(iframe)

  iframe.contentDocument.open()
  iframe.contentDocument.write(html)
  iframe.contentDocument.close()

  // Wait for fonts and layout
  await new Promise(resolve => setTimeout(resolve, 400))
  const contentH = iframe.contentDocument.body.scrollHeight + 20
  iframe.style.height = contentH + 'px'
  await new Promise(resolve => setTimeout(resolve, 100))

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(iframe.contentDocument.body, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: 500,
  })
  document.body.removeChild(iframe)

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const W = canvas.width / 2
  const H = canvas.height / 2
  const pdf = new jsPDF({ unit: 'px', format: [W, H] })
  pdf.addImage(imgData, 'JPEG', 0, 0, W, H)

  const blob = pdf.output('blob')
  const file = new File([blob], 'Champion-Square-Receipt.pdf', { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Purchase Receipt — Champion Square' })
  } else {
    // Desktop fallback: download the PDF
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Champion-Square-Receipt.pdf'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
