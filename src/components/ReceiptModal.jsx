import { format } from 'date-fns'
import { X, Download } from 'lucide-react'
import { buildWhatsAppText, printReceipt } from '../lib/receipt'

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default function ReceiptModal({ data, onClose }) {
  if (!data) return null

  const date = data.sold_at
    ? format(new Date(data.sold_at), 'dd MMM yyyy, hh:mm a')
    : format(new Date(), 'dd MMM yyyy, hh:mm a')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold text-base">Sale Receipt</h2>
            {data._fresh && <p className="text-emerald-400 text-xs mt-0.5">✓ Sale recorded successfully</p>}
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1.5 rounded-lg hover:bg-[#2a2a45] transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="bg-[#12121f] rounded-xl p-4 space-y-3 mb-5">
          <div>
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wide">Buyer</p>
            <p className="text-white font-semibold text-sm mt-0.5">{data.buyer_name}</p>
            {data.buyer_phone && <p className="text-[#9ca3af] text-xs">{data.buyer_phone}</p>}
          </div>
          <div className="border-t border-[#2a2a45] pt-3 space-y-2">
            <p className="text-[#6b7280] text-[10px] uppercase tracking-wide mb-2">Books</p>
            {data.books.map((b, i) => {
              const lvl = [b.exam_level, b.unit, b.part].filter(Boolean).join(' › ')
              return (
                <div key={i} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm leading-snug">{b.title}</p>
                    {lvl && <p className="text-[#6b7280] text-xs mt-0.5">{lvl}</p>}
                  </div>
                  <span className="text-[#9ca3af] text-xs flex-shrink-0 mt-0.5">×{b.qty || 1}</span>
                </div>
              )
            })}
          </div>
          <div className="border-t border-[#2a2a45] pt-3 flex items-center justify-between">
            {data.total_price
              ? <><p className="text-[#6b7280] text-sm">Total</p><p className="text-[#f0a500] font-bold text-base">₹{data.total_price}</p></>
              : <p className="text-[#4b5563] text-xs italic">No price recorded</p>
            }
          </div>
          <p className="text-[#4b5563] text-xs">{date}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => printReceipt(data)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2a2a45] hover:bg-[#3a3a55] text-white text-sm font-medium transition-all">
            <Download size={15} /> Download
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(data))}`, '_blank')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] hover:bg-[#1fb857] text-white text-sm font-semibold transition-all">
            <WhatsAppIcon /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
