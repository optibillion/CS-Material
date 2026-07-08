import { format } from 'date-fns'

export function buildWhatsAppText({ buyer_name, buyer_phone, books, total_price, sold_at }) {
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookLines = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `${i + 1}. ${b.title}${lvl ? ` (${lvl})` : ''} × ${b.qty || 1}`
  }).join('\n')
  return [
    `🎓 *Champion Square*`,
    `📄 *Purchase Receipt*`,
    ``,
    `📅 Date: ${date}`,
    ``,
    `👤 *Buyer Details*`,
    `Name: ${buyer_name}`,
    buyer_phone ? `Phone: ${buyer_phone}` : null,
    ``,
    `📚 *Books Purchased*`,
    bookLines,
    ``,
    total_price ? `💰 *Total Amount: ₹${total_price}*` : null,
    ``,
    `─────────────────────`,
    `Thank you for choosing Champion Square! 🙏`,
    `For queries, contact us.`,
  ].filter(l => l !== null).join('\n')
}

export function printReceipt({ buyer_name, buyer_phone, books, total_price, sold_at }) {
  const date = sold_at
    ? format(new Date(sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')
  const bookRows = books.map((b, i) => {
    const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
    return `<tr>
      <td>
        <div class="book-title">${i + 1}. ${b.title}</div>
        ${lvl ? `<div class="book-meta">${lvl}</div>` : ''}
      </td>
      <td class="book-qty">${b.qty || 1}</td>
    </tr>`
  }).join('')

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Purchase Receipt — Champion Square</title>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: #fff; color: #1a1a1a; font-size: 13px; }
    .page { max-width: 420px; margin: 0 auto; padding: 32px 28px; }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: 800; color: #bd0a0a; letter-spacing: -0.3px; }
    .receipt-label { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #555; border: 1px solid #ddd; padding: 3px 10px; border-radius: 20px; }
    .receipt-no { font-size: 10px; color: #aaa; margin-top: 6px; }
    .divider-solid { border: none; border-top: 2px solid #bd0a0a; margin: 0; }
    .divider-dashed { border: none; border-top: 1px dashed #ddd; margin: 16px 0; }
    .section { margin: 16px 0; }
    .section-label { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bd0a0a; margin-bottom: 6px; }
    .info-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
    .info-key { font-size: 11px; color: #888; }
    .info-val { font-size: 13px; font-weight: 600; color: #1a1a1a; text-align: right; }
    .books-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .books-table th { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: #aaa; font-weight: 600; padding: 0 0 6px; text-align: left; border-bottom: 1px solid #eee; }
    .books-table th:last-child { text-align: right; }
    .books-table td { padding: 8px 0; vertical-align: top; border-bottom: 1px solid #f5f5f5; font-size: 12px; }
    .books-table tr:last-child td { border-bottom: none; }
    .book-title { font-weight: 600; color: #1a1a1a; line-height: 1.3; }
    .book-meta { font-size: 10px; color: #999; margin-top: 2px; }
    .book-qty { text-align: right; font-weight: 600; color: #444; white-space: nowrap; padding-left: 12px; }
    .total-box { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
    .total-label { font-size: 11px; color: #888; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    .total-value { font-size: 20px; font-weight: 800; color: #bd0a0a; }
    .footer { margin-top: 28px; text-align: center; }
    .footer-line { border-top: 1px solid #eee; padding-top: 14px; }
    .footer-text { font-size: 11px; color: #aaa; line-height: 1.8; }
    .thank-you { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 4px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 20px; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">Champion Square</div>
    <div class="receipt-label">Purchase Receipt</div>
    <div class="receipt-no">${date}</div>
  </div>
  <hr class="divider-solid" />

  <div class="section">
    <div class="section-label">Buyer Details</div>
    <div class="info-row">
      <span class="info-key">Name</span>
      <span class="info-val">${buyer_name}</span>
    </div>
    ${buyer_phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${buyer_phone}</span></div>` : ''}
  </div>

  <hr class="divider-dashed" />

  <div class="section">
    <div class="section-label">Books Purchased</div>
    <table class="books-table">
      <thead>
        <tr>
          <th>Book / Details</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        ${bookRows}
      </tbody>
    </table>
  </div>

  ${total_price ? `<div class="total-box"><span class="total-label">Total Amount</span><span class="total-value">₹${total_price}</span></div>` : ''}

  <div class="footer">
    <div class="footer-line">
      <div class="thank-you">Thank you for your purchase!</div>
      <div class="footer-text">
        Champion Square · IAS Preparation Materials<br>
        सटीकता, अनुभव और भरोसे का संगम
      </div>
    </div>
  </div>
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}
