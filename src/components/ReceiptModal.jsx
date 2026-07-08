import { useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import { printReceipt, shareReceiptPDF } from '../lib/receipt'
import toast from 'react-hot-toast'

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default function ReceiptModal({ data, onClose }) {
  const [sharing, setSharing] = useState(false)

  if (!data) return null

  async function handleWhatsApp() {
    setSharing(true)
    try {
      await shareReceiptPDF(data)
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Could not share. Try downloading the PDF.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-white font-semibold text-sm">{data.buyer_name}</p>
            {data.buyer_phone && <p className="text-[#6b7280] text-xs mt-0.5">{data.buyer_phone}</p>}
            <p className="text-[#6b7280] text-xs mt-0.5">
              {data.books.length} book{data.books.length !== 1 ? 's' : ''}
              {data.total_price ? ` · ₹${data.total_price}` : ''}
              {data.sold_by_name ? ` · by ${data.sold_by_name}` : ''}
            </p>
            {data._fresh && <p className="text-emerald-400 text-xs mt-1">✓ Sale recorded</p>}
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white p-1.5 rounded-lg hover:bg-[#2a2a45] transition-all flex-shrink-0 ml-3">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => printReceipt(data)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-[#2a2a45] hover:bg-[#3a3a55] text-white transition-all">
            <Download size={20} />
            <span className="text-sm font-medium">Download</span>
          </button>
          <button
            onClick={handleWhatsApp}
            disabled={sharing}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-[#25D366] hover:bg-[#1fb857] disabled:opacity-70 text-white transition-all">
            {sharing ? <Loader2 size={20} className="animate-spin" /> : <WhatsAppIcon />}
            <span className="text-sm font-semibold">{sharing ? 'Preparing...' : 'WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
