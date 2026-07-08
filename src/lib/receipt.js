import { format } from 'date-fns'

export function buildWhatsAppText({ buyer_name, buyer_phone, books, total_price, sold_at }) {
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookLines = books.map(b => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `• ${b.title}${lvl ? ` (${lvl})` : ''} × ${b.qty || 1}`
  }).join('\n')
  return [
    `*Champion Square IAS — Sale Receipt*`,
    ``,
    `📅 ${date}`,
    ``,
    `*Buyer:* ${buyer_name}`,
    buyer_phone ? `*Phone:* ${buyer_phone}` : null,
    ``,
    `*Books Purchased:*`,
    bookLines,
    total_price ? `\n*Total: ₹${total_price}*` : null,
    ``,
    `Thank you for your purchase! 🙏`,
    `— Champion Square IAS`,
  ].filter(l => l !== null).join('\n')
}

export function printReceipt({ buyer_name, buyer_phone, books, total_price, sold_at }) {
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookRows = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `<div class="book-item">
      <div class="book-num">${i + 1}.</div>
      <div class="book-details">
        <div class="book-title">${b.title}</div>
        ${lvl ? `<div class="book-meta">${lvl}</div>` : ''}
        <div class="book-qty">Qty: ${b.qty || 1}</div>
      </div>
    </div>`
  }).join('')

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Sale Receipt</title>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 24px; max-width: 380px; margin: 0 auto; color: #222; font-size: 13px; }
    .header { text-align: center; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 2px solid #bd0a0a; }
    .brand { font-size: 17px; font-weight: bold; color: #bd0a0a; letter-spacing: 0.3px; }
    .tagline { font-size: 10px; color: #888; margin-top: 3px; }
    .label { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 12px; margin-bottom: 3px; }
    .value { font-size: 13px; font-weight: 600; color: #222; }
    .sub { font-size: 12px; color: #555; }
    .divider { border-top: 1px dashed #ddd; margin: 10px 0; }
    .section-title { font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
    .book-item { display: flex; gap: 6px; padding: 7px 0; border-bottom: 1px solid #f0f0f0; }
    .book-item:last-child { border-bottom: none; }
    .book-num { color: #888; font-size: 12px; flex-shrink: 0; padding-top: 1px; }
    .book-title { font-weight: 600; font-size: 13px; color: #222; }
    .book-meta { font-size: 11px; color: #888; margin-top: 2px; }
    .book-qty { font-size: 11px; color: #555; margin-top: 2px; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0 0; }
    .total-label { font-size: 12px; color: #888; }
    .total-value { font-size: 17px; font-weight: bold; color: #bd0a0a; }
    .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 18px; padding-top: 10px; border-top: 1px solid #eee; line-height: 1.6; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Champion Square IAS</div>
    <div class="tagline">Sale Receipt</div>
  </div>
  <div class="label">Date</div>
  <div class="value">${date}</div>
  <div class="divider"></div>
  <div class="label">Buyer</div>
  <div class="value">${buyer_name}</div>
  ${buyer_phone ? `<div class="sub">${buyer_phone}</div>` : ''}
  <div class="divider"></div>
  <div class="section-title">Books Purchased</div>
  ${bookRows}
  ${total_price ? `<div class="divider"></div><div class="total-row"><span class="total-label">Total Amount</span><span class="total-value">₹${total_price}</span></div>` : ''}
  <div class="footer">Champion Square IAS · Indore<br>सटीकता, अनुभव और भरोसे का संगम</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}
