import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import { Plus, Search, AlertTriangle, History, Package, X, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { logAction } from '../../lib/audit'
import { format } from 'date-fns'
import { useAuthStore } from '../../store/authStore'

const MEDIUM_LABELS = { hindi: 'Hindi', english: 'English', both: 'Both' }
const MEDIUM_COLORS = { hindi: 'bg-orange-500/20 text-orange-400 border-orange-500/30', english: 'bg-blue-500/20 text-blue-400 border-blue-500/30', both: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
const CAT_COLORS = { booklet: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', book: 'bg-sky-500/20 text-sky-400 border-sky-500/30', notes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }

function AddBatchModal({ open, onClose, onSave, allBooks, stock, preBook }) {
  const [cart, setCart] = useState([]) // [{ bookId, qty, note }]
  const [bookSearch, setBookSearch] = useState('')
  const [filterMedium, setFilterMedium] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterExam, setFilterExam] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterPart, setFilterPart] = useState('')
  const [step, setStep] = useState('select')
  const [confirmData, setConfirmData] = useState([])
  const [loadingConfirm, setLoadingConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      setCart(preBook ? [{ bookId: preBook.id, qty: 1, note: '' }] : [])
      setBookSearch(''); setStep('select'); setConfirmData([])
      setFilterMedium(''); setFilterCat(''); setFilterExam(''); setFilterUnit(''); setFilterPart('')
    }
  }, [open, preBook])

  const examOptions = [...new Set(allBooks.map(b => b.exam_level).filter(Boolean))].sort()
  const unitOptions = [...new Set(allBooks.filter(b => !filterExam || b.exam_level === filterExam).map(b => b.unit).filter(Boolean))].sort()
  const partOptions = [...new Set(allBooks.filter(b => (!filterExam || b.exam_level === filterExam) && (!filterUnit || b.unit === filterUnit)).map(b => b.part).filter(Boolean))].sort()

  const visibleBooks = allBooks.filter(b => {
    const q = bookSearch.toLowerCase()
    const matchQ = !q || [b.title, b.exam_level, b.unit, b.part, b.subject].some(f => f?.toLowerCase().includes(q))
    return matchQ
      && (!filterMedium || b.medium === filterMedium)
      && (!filterCat || b.category === filterCat)
      && (!filterExam || b.exam_level === filterExam)
      && (!filterUnit || b.unit === filterUnit)
      && (!filterPart || b.part === filterPart)
  })

  function toggleCart(bookId) {
    setCart(c => c.find(i => i.bookId === bookId) ? c.filter(i => i.bookId !== bookId) : [...c, { bookId, qty: 1, note: '' }])
  }
  function updateCartQty(bookId, val) {
    setCart(c => c.map(i => i.bookId === bookId ? { ...i, qty: parseInt(val)||1 } : i))
  }
  function removeFromCart(bookId) {
    setCart(c => c.filter(i => i.bookId !== bookId))
  }

  async function handleReview() {
    const valid = cart.filter(i => i.qty >= 1)
    if (!valid.length) { toast.error('Add at least one book with quantity'); return }
    setLoadingConfirm(true)
    try {
      const results = await Promise.all(valid.map(async item => {
        const book = allBooks.find(b => b.id === item.bookId)
        const existingEntry = stock.find(s => s.book_id === item.bookId)
        const { data: prevData } = await supabase.from('issuances').select('id').eq('book_id', item.bookId).eq('is_previous_issuance', true)
        const prevSafe = (prevData||[]).length
        if (existingEntry) {
          return { book, qty: item.qty, note: item.note, existingEntry, deductInfo: null, prevSafe }
        }
        const [{ data: salesData }, { data: issuancesData }, { data: allotmentsData }] = await Promise.all([
          supabase.from('sales').select('qty').eq('book_id', item.bookId).eq('is_returned', false),
          supabase.from('issuances').select('id').eq('book_id', item.bookId).eq('is_previous_issuance', false).eq('is_reversed', false),
          supabase.from('allotments').select('qty').eq('book_id', item.bookId),
        ])
        const soldQty     = (salesData||[]).reduce((s, r) => s + (r.qty||1), 0)
        const issuedQty   = (issuancesData||[]).length
        const allottedQty = (allotmentsData||[]).reduce((s, r) => s + (r.qty||1), 0)
        const totalDeduct = soldQty + issuedQty + allottedQty
        const finalAvail  = Math.max(0, item.qty - totalDeduct)
        return { book, qty: item.qty, note: item.note, existingEntry, deductInfo: { soldQty, issuedQty, allottedQty, totalDeduct, finalAvail }, prevSafe }
      }))
      setConfirmData(results)
      setStep('confirm')
    } finally {
      setLoadingConfirm(false)
    }
  }

  async function handleConfirmAll() {
    for (const item of confirmData) {
      await onSave({ bookId: item.book.id, qty: item.qty, note: item.note || null, existingEntry: item.existingEntry })
    }
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-base">{step === 'confirm' ? 'Confirm Stock Entry' : 'Add Stock'}</h2>
            <p className="text-[#6b7280] text-xs mt-0.5">
              {step === 'confirm'
                ? `${confirmData.length} book${confirmData.length !== 1 ? 's' : ''} ready to save`
                : 'Select books and set quantities'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>

        {step === 'select' ? (<>
          {/* Filters + Book List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5 min-h-0">
            {!preBook && (<>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)}
                  placeholder="Search title, exam, unit, part…"
                  className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg pl-8 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {['hindi','english','both'].map(m => (
                  <button key={m} type="button" onClick={() => setFilterMedium(f => f===m ? '' : m)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${filterMedium===m ? MEDIUM_COLORS[m] : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {MEDIUM_LABELS[m]}
                  </button>
                ))}
                {['booklet','book','notes'].map(c => (
                  <button key={c} type="button" onClick={() => setFilterCat(f => f===c ? '' : c)}
                    className={`text-xs px-2 py-0.5 rounded-full border capitalize transition-all ${filterCat===c ? CAT_COLORS[c] : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {c}
                  </button>
                ))}
                {examOptions.map(e => (
                  <button key={e} type="button" onClick={() => { setFilterExam(f => f===e ? '' : e); setFilterUnit(''); setFilterPart('') }}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-all ${filterExam===e ? 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30' : 'border-[#2a2a45] text-[#6b7280] hover:text-white'}`}>
                    {e}
                  </button>
                ))}
              </div>
              {(unitOptions.length > 0 || partOptions.length > 0) && (
                <div className="flex gap-2">
                  {unitOptions.length > 0 && (
                    <select value={filterUnit} onChange={e => { setFilterUnit(e.target.value); setFilterPart('') }}
                      className="flex-1 bg-[#12121f] border border-[#2a2a45] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#bd0a0a]">
                      <option value="">All Papers</option>
                      {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  )}
                  {partOptions.length > 0 && (
                    <select value={filterPart} onChange={e => setFilterPart(e.target.value)}
                      className="flex-1 bg-[#12121f] border border-[#2a2a45] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#bd0a0a]">
                      <option value="">All Parts</option>
                      {partOptions.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  )}
                </div>
              )}
              <div className="space-y-1.5 max-h-44 overflow-y-auto">
                {visibleBooks.length === 0
                  ? <p className="text-[#6b7280] text-xs text-center py-4">No books match</p>
                  : visibleBooks.map(b => {
                    const inCart = cart.find(i => i.bookId === b.id)
                    return (
                      <button key={b.id} type="button" onClick={() => toggleCart(b.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${inCart ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[#2a2a45] bg-[#12121f] hover:border-[#3a3a55]'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium leading-snug truncate">{b.title}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {b.exam_level && <span className="text-[#9ca3af] text-xs">{b.exam_level}</span>}
                              {b.unit && <span className="text-[#6b7280] text-xs">· {b.unit}</span>}
                              {b.part && <span className="text-[#6b7280] text-xs">· {b.part}</span>}
                              {b.medium && <span className={`text-xs px-1 py-0.5 rounded border ${MEDIUM_COLORS[b.medium]||''}`}>{MEDIUM_LABELS[b.medium]}</span>}
                            </div>
                          </div>
                          {inCart && <span className="text-emerald-400 text-xs font-semibold flex-shrink-0">✓</span>}
                        </div>
                      </button>
                    )
                  })
                }
              </div>
            </>)}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border-t border-[#2a2a45] px-5 py-3 space-y-2 max-h-52 overflow-y-auto flex-shrink-0">
              <p className="text-[#9ca3af] text-xs uppercase tracking-wide font-semibold">{cart.length} book{cart.length !== 1 ? 's' : ''} selected</p>
              {cart.map(item => {
                const book = allBooks.find(b => b.id === item.bookId)
                if (!book) return null
                return (
                  <div key={item.bookId} className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{book.title}</p>
                      {(book.unit || book.part) && (
                        <p className="text-[#6b7280] text-xs truncate">{[book.unit, book.part].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input type="number" min="1" value={item.qty}
                        onChange={e => updateCartQty(item.bookId, e.target.value)}
                        className="w-16 bg-[#1a1a2e] border border-[#2a2a45] rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-[#bd0a0a]" />
                      <button onClick={() => removeFromCart(item.bookId)} className="text-[#6b7280] hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-3 px-5 py-4 border-t border-[#2a2a45] flex-shrink-0">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
            <button onClick={handleReview} disabled={cart.length === 0 || loadingConfirm}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all disabled:opacity-50">
              {loadingConfirm ? 'Checking…' : `Review${cart.length > 0 ? ` (${cart.length})` : ''}`}
            </button>
          </div>
        </>) : (<>
          {/* Confirm Screen */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
            {confirmData.map(item => (
              <div key={item.book.id} className="bg-[#12121f] border border-[#2a2a45] rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-white font-semibold text-sm">{item.book.title}</p>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    {item.book.exam_level && <span className="text-[#9ca3af] text-xs">{item.book.exam_level}</span>}
                    {item.book.unit && <span className="text-[#9ca3af] text-xs">· {item.book.unit}</span>}
                    {item.book.part && <span className="text-[#9ca3af] text-xs">· {item.book.part}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {item.book.category && <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[item.book.category]||'border-[#2a2a45] text-[#6b7280]'}`}>{item.book.category}</span>}
                    {item.book.medium && <span className={`text-xs px-1.5 py-0.5 rounded border ${MEDIUM_COLORS[item.book.medium]||''}`}>{MEDIUM_LABELS[item.book.medium]}</span>}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#9ca3af] text-xs">Quantity adding</span>
                  <span className="text-white font-bold text-lg">{item.qty} <span className="text-xs font-normal text-[#6b7280]">copies</span></span>
                </div>

                {item.prevSafe > 0 && (
                  <div className="flex items-center justify-between bg-[#f0a500]/10 border border-[#f0a500]/20 rounded-lg px-3 py-1.5">
                    <span className="text-[#f0a500] text-xs">Previous issuances — not deducted</span>
                    <span className="text-[#f0a500] font-semibold">{item.prevSafe}</span>
                  </div>
                )}

                {item.deductInfo ? (
                  <div className="space-y-1.5">
                    <p className="text-red-400 text-xs font-semibold uppercase tracking-wide">First entry — auto-deduction</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[['Issued', item.deductInfo.issuedQty], ['Sold', item.deductInfo.soldQty], ['Allotted', item.deductInfo.allottedQty]].map(([label, val]) => (
                        <div key={label} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-lg py-2 text-center">
                          <p className="text-white font-semibold text-sm">{val}</p>
                          <p className="text-[#6b7280] text-xs">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-[#2a2a45] pt-1.5">
                      <span className="text-[#9ca3af] text-xs">Total deducted</span>
                      <span className="text-red-400 font-semibold">− {item.deductInfo.totalDeduct}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9ca3af] text-xs">Final available</span>
                      <span className="text-emerald-400 font-bold text-base">{item.deductInfo.finalAvail}</span>
                    </div>
                  </div>
                ) : item.existingEntry ? (
                  <div className="flex justify-between items-center">
                    <span className="text-[#9ca3af] text-xs">Available after adding</span>
                    <span className="text-emerald-400 font-bold">{item.existingEntry.available_qty + item.qty}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-[#2a2a45] flex-shrink-0">
            <button onClick={() => setStep('select')} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Go Back</button>
            <button onClick={handleConfirmAll} className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">
              Confirm All ({confirmData.length})
            </button>
          </div>
        </>)}
      </div>
    </div>
  )
}

function CorrectModal({ open, onClose, onSave, editing, allBooks }) {
  const [availableQty, setAvailableQty] = useState('')
  const [threshold, setThreshold] = useState('50')

  useEffect(() => {
    if (open && editing) {
      setAvailableQty(String(editing.available_qty))
      setThreshold(String(editing.low_stock_threshold))
    }
  }, [open, editing])

  if (!open || !editing) return null
  const book = allBooks.find(b => b.id === editing.book_id)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-xl w-full sm:max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45]">
          <div>
            <h2 className="text-white font-semibold text-base">Correct Stock Count</h2>
            <p className="text-[#6b7280] text-xs mt-0.5">Use only after a physical recount</p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-[#12121f] border border-[#2a2a45] rounded-lg px-4 py-3">
            <p className="text-white text-sm font-medium">{book?.title || '—'}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">Total received so far: {editing.total_qty}</p>
          </div>
          <div>
            <label className="text-[#9ca3af] text-xs uppercase tracking-wide mb-2 block">Correct Available Qty</label>
            <input type="number" min="0" value={availableQty} onChange={e => setAvailableQty(e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
            <p className="text-[#6b7280] text-xs mt-1">Set to exactly how many copies are physically on the shelf</p>
          </div>
          <div>
            <label className="text-[#9ca3af] text-xs mb-1.5 block">Low Stock Alert At</label>
            <input type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)}
              className="w-full bg-[#12121f] border border-[#2a2a45] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a]" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#2a2a45]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a45] text-[#9ca3af] hover:bg-[#2a2a45] text-sm transition-all">Cancel</button>
          <button onClick={() => { onSave({ available_qty: parseInt(availableQty)||0, low_stock_threshold: parseInt(threshold)||50 }); onClose() }}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-semibold text-sm transition-all">Save Correction</button>
        </div>
      </div>
    </div>
  )
}

function BookHistoryModal({ open, onClose, bookId, bookTitle }) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !bookId) return
    setLoading(true)
    Promise.all([
      supabase.from('issuances')
        .select('id, issued_at, is_reversed, is_previous_issuance, students(name, student_id), users!issuances_issued_by_fkey(name)')
        .eq('book_id', bookId).order('issued_at', { ascending: false }),
      supabase.from('sales')
        .select('id, sold_at, qty, buyer_name, buyer_phone, is_returned, users!sales_sold_by_fkey(name)')
        .eq('book_id', bookId).order('sold_at', { ascending: false }),
      supabase.from('allotments')
        .select('id, allotted_at, qty, institution_name, contact_person, type, users!allotments_allotted_by_fkey(name)')
        .eq('book_id', bookId).order('allotted_at', { ascending: false }),
      supabase.from('stock_additions')
        .select('id, added_at, qty, note, users(name)')
        .eq('book_id', bookId).order('added_at', { ascending: false }),
    ]).then(([{ data: iss }, { data: sal }, { data: all }, { data: additions }]) => {
      const merged = [
        ...(iss||[]).map(i => ({
          key: `i-${i.id}`, type: i.is_previous_issuance ? 'PREV_ISSUANCE' : 'ISSUANCE',
          to: `${i.students?.name||'—'} (${i.students?.student_id||''})`,
          qty: 1, by: i.users?.name||'—', date: i.issued_at, voided: i.is_reversed
        })),
        ...(sal||[]).map(s => ({
          key: `s-${s.id}`, type: 'SALE',
          to: s.buyer_name + (s.buyer_phone ? ` · ${s.buyer_phone}` : ''),
          qty: s.qty||1, by: s.users?.name||'—', date: s.sold_at, voided: s.is_returned
        })),
        ...(all||[]).map(a => ({
          key: `a-${a.id}`, type: 'ALLOTMENT',
          to: a.institution_name + (a.contact_person ? ` · ${a.contact_person}` : '') + ` (${a.type})`,
          qty: a.qty||1, by: a.users?.name||'—', date: a.allotted_at, voided: false
        })),
        ...(additions||[]).map(a => ({
          key: `sa-${a.id}`, type: 'STOCK_IN',
          to: `+${a.qty} copies received${a.note ? ` — ${a.note}` : ''}`,
          qty: a.qty, by: a.users?.name||'—', date: a.added_at, voided: false
        })),
      ].sort((a,b) => new Date(b.date) - new Date(a.date))
      setMovements(merged)
      setLoading(false)
    })
  }, [open, bookId])

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a45] flex-shrink-0">
          <div>
            <p className="text-white font-semibold text-sm">{bookTitle}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">{loading ? '…' : `${movements.length} total movements`}</p>
          </div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-white"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-[#2a2a45]">
          {loading ? [...Array(5)].map((_,i) => (
            <div key={i} className="px-5 py-3 animate-pulse">
              <div className="h-4 bg-[#2a2a45] rounded w-3/4 mb-2"/>
              <div className="h-3 bg-[#2a2a45] rounded w-1/2"/>
            </div>
          )) : movements.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-10">No movements recorded for this book</p>
          ) : movements.map(m => {
            const ts = TYPE_STYLES[m.type]
            return (
              <div key={m.key} className={`px-5 py-3 ${m.voided ? 'opacity-40' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ts.cls}`}>{ts.label}</span>
                      {m.voided && <span className="text-[#6b7280] text-xs">reversed/returned</span>}
                    </div>
                    <p className="text-white text-sm truncate">{m.type === 'STOCK_IN' ? m.to : `→ ${m.to}`}</p>
                    <p className="text-[#6b7280] text-xs mt-0.5">{m.type !== 'STOCK_IN' ? `qty ${m.qty} · ` : ''}by {m.by}</p>
                  </div>
                  <p className="text-[#6b7280] text-xs whitespace-nowrap flex-shrink-0">{format(new Date(m.date), 'dd MMM yy, hh:mm a')}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TYPE_STYLES = {
  STOCK_IN:      { label: 'Stock In',       cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  ISSUANCE:      { label: 'Issuance',       cls: 'bg-[#bd0a0a]/20 text-red-400 border-[#bd0a0a]/30' },
  PREV_ISSUANCE: { label: 'Prev. Issuance', cls: 'bg-[#f0a500]/20 text-[#f0a500] border-[#f0a500]/30' },
  SALE:          { label: 'Sale',           cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ALLOTMENT:     { label: 'Allotment',      cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
}

export default function Inventory() {
  const { isAdmin, stockAccess, profile } = useAuthStore()
  const canEdit = isAdmin || stockAccess === 'edit'

  const [tab, setTab] = useState('stock')
  const [stock, setStock] = useState([])
  const [books, setBooks] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [addBatchOpen, setAddBatchOpen] = useState(false)
  const [preBook, setPreBook] = useState(null)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [historyBook, setHistoryBook] = useState(null)

  useEffect(() => { fetchAll() }, [])
  useRealtime('stock', fetchAll)

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase.from('stock').select('*, books(title, category, exam_level, unit, part, medium)').order('id', { ascending: false }),
      supabase.from('books').select('*').eq('is_active', true)
    ])
    setStock(s || [])
    setBooks(b || [])
    setLoading(false)
  }

  async function fetchHistory() {
    setHistLoading(true)
    const [{ data: iss }, { data: sal }, { data: all }, { data: additions }] = await Promise.all([
      supabase.from('issuances')
        .select('id, issued_at, is_reversed, is_previous_issuance, books(title), students(name, student_id), users!issuances_issued_by_fkey(name)')
        .order('issued_at', { ascending: false }).limit(500),
      supabase.from('sales')
        .select('id, sold_at, qty, buyer_name, buyer_phone, is_returned, books(title), users!sales_sold_by_fkey(name)')
        .order('sold_at', { ascending: false }).limit(500),
      supabase.from('allotments')
        .select('id, allotted_at, qty, institution_name, contact_person, type, books(title), users!allotments_allotted_by_fkey(name)')
        .order('allotted_at', { ascending: false }).limit(500),
      supabase.from('stock_additions')
        .select('id, added_at, qty, note, books(title), users(name)')
        .order('added_at', { ascending: false }).limit(500),
    ])
    const merged = [
      ...(iss||[]).map(i => ({
        key: `i-${i.id}`, type: i.is_previous_issuance ? 'PREV_ISSUANCE' : 'ISSUANCE',
        book: i.books?.title||'—',
        to: `${i.students?.name||'—'} (${i.students?.student_id||''})`,
        qty: 1, by: i.users?.name||'—', date: i.issued_at, voided: i.is_reversed
      })),
      ...(sal||[]).map(s => ({
        key: `s-${s.id}`, type: 'SALE',
        book: s.books?.title||'—',
        to: s.buyer_name + (s.buyer_phone ? ` · ${s.buyer_phone}` : ''),
        qty: s.qty||1, by: s.users?.name||'—', date: s.sold_at, voided: s.is_returned
      })),
      ...(all||[]).map(a => ({
        key: `a-${a.id}`, type: 'ALLOTMENT',
        book: a.books?.title||'—',
        to: a.institution_name + (a.contact_person ? ` · ${a.contact_person}` : '') + ` (${a.type})`,
        qty: a.qty||1, by: a.users?.name||'—', date: a.allotted_at, voided: false
      })),
      ...(additions||[]).map(a => ({
        key: `sa-${a.id}`, type: 'STOCK_IN',
        book: a.books?.title||'—',
        to: `+${a.qty} copies received${a.note ? ` — ${a.note}` : ''}`,
        qty: a.qty, by: a.users?.name||'—', date: a.added_at, voided: false
      })),
    ].sort((a,b) => new Date(b.date) - new Date(a.date))
    setMovements(merged)
    setHistLoading(false)
  }

  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab])

  async function handleAddBatch({ bookId, qty, note, existingEntry }) {
    const bookTitle = books.find(b => b.id === bookId)?.title || 'Book'

    if (existingEntry) {
      // Add to existing stock entry
      const { error } = await supabase.from('stock').update({
        total_qty: existingEntry.total_qty + qty,
        available_qty: existingEntry.available_qty + qty,
      }).eq('id', existingEntry.id)
      if (error) { toast.error('Failed to update stock'); return }

      await supabase.from('stock_additions').insert({
        book_id: bookId, qty, added_by: profile?.id, note
      })

      toast.success(`+${qty} copies added → ${existingEntry.available_qty + qty} available`)
      logAction('STOCK_ADDED', `${bookTitle} +${qty} copies`)
    } else {
      // First time — create entry then reconcile past records
      const { data: newStock, error } = await supabase.from('stock')
        .insert({ book_id: bookId, location: 'Main Campus', total_qty: qty, available_qty: qty, low_stock_threshold: 50 })
        .select('id').single()
      if (error) { toast.error('Failed to add stock'); return }

      const [{ data: salesData }, { data: issuancesData }, { data: allotmentsData }] = await Promise.all([
        supabase.from('sales').select('qty').eq('book_id', bookId).eq('is_returned', false),
        supabase.from('issuances').select('id').eq('book_id', bookId).eq('is_previous_issuance', false).eq('is_reversed', false),
        supabase.from('allotments').select('qty').eq('book_id', bookId),
      ])
      const soldQty     = (salesData||[]).reduce((s, r) => s + (r.qty||1), 0)
      const issuedQty   = (issuancesData||[]).length
      const allottedQty = (allotmentsData||[]).reduce((s, r) => s + (r.qty||1), 0)
      const totalDeduct = soldQty + issuedQty + allottedQty
      const finalAvail  = Math.max(0, qty - totalDeduct)

      if (totalDeduct > 0) {
        await supabase.from('stock').update({ available_qty: finalAvail }).eq('id', newStock.id)
      }

      await supabase.from('stock_additions').insert({
        book_id: bookId, qty, added_by: profile?.id, note
      })

      if (totalDeduct > 0) {
        toast.success(
          `${qty} added — auto-deducted ${totalDeduct} past records (${soldQty} sold · ${issuedQty} issued · ${allottedQty} distributor) → ${finalAvail} available`,
          { duration: 6000 }
        )
        logAction('STOCK_CREATED', `${bookTitle} +${qty}, ${finalAvail} available after reconciling ${totalDeduct} past`)
      } else {
        toast.success(`${qty} copies added — ${finalAvail} available`)
        logAction('STOCK_CREATED', `${bookTitle} +${qty}`)
      }
    }
    fetchAll()
  }

  async function handleCorrect({ available_qty, low_stock_threshold }) {
    const { error } = await supabase.from('stock').update({ available_qty, low_stock_threshold }).eq('id', editing.id)
    if (error) { toast.error('Failed to save'); return }
    const bookTitle = books.find(b => b.id === editing.book_id)?.title || editing.book_id
    toast.success('Stock count corrected')
    logAction('STOCK_CORRECTED', `${bookTitle} — available set to ${available_qty}`)
    fetchAll()
  }

  const filtered = stock.filter(s => {
    const q = search.toLowerCase()
    if (!q) return true
    const b = s.books
    return [b?.title, b?.exam_level, b?.unit, b?.part, b?.medium, b?.category].some(f => f?.toLowerCase().includes(q))
  })

  const q = histSearch.toLowerCase()
  const filteredMov = movements.filter(m =>
    m.book.toLowerCase().includes(q) ||
    m.to.toLowerCase().includes(q) ||
    m.by.toLowerCase().includes(q) ||
    m.type.toLowerCase().includes(q)
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Inventory</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{tab === 'stock' ? `${stock.length} books tracked` : `${movements.length} movements`}</p>
        </div>
        {tab === 'stock' && canEdit && (
          <button onClick={() => { setPreBook(null); setAddBatchOpen(true) }}
            className="flex items-center gap-2 bg-[#bd0a0a] hover:bg-[#a00909] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all">
            <Plus size={16} /> Add Stock
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-[#12121f] border border-[#2a2a45] rounded-lg p-1 w-fit">
        <button onClick={() => setTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab==='stock' ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
          <Package size={14} /> Stock
        </button>
        <button onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab==='history' ? 'bg-[#bd0a0a] text-white' : 'text-[#9ca3af] hover:text-white'}`}>
          <History size={14} /> History
        </button>
      </div>

      {tab === 'stock' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by book..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>

          {/* Desktop table */}
          <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-[#2a2a45]">
                  {['BOOK','AVAILABLE','TOTAL IN','STATUS','ACTIONS'].map(h=>(
                    <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a45]">
                {loading ? [...Array(4)].map((_,i)=>(
                  <tr key={i}>{[...Array(5)].map((_,j)=>(
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
                  ))}</tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={5} className="text-center text-[#6b7280] py-10 text-sm">No stock entries — click Add Stock to get started</td></tr>
                ) : filtered.map(s => {
                  const isLow = s.available_qty <= s.low_stock_threshold
                  return (
                    <tr key={s.id} className="hover:bg-[#12121f] transition-colors cursor-pointer"
                      onClick={() => setHistoryBook({ id: s.book_id, title: s.books?.title })}>
                      <td className="px-5 py-3">
                        {(s.books?.exam_level || s.books?.unit || s.books?.part) ? (
                          <p className="text-white text-sm font-semibold leading-snug">{[s.books.exam_level, s.books.unit, s.books.part].filter(Boolean).join(' › ')}</p>
                        ) : null}
                        <p className={`${(s.books?.exam_level || s.books?.unit || s.books?.part) ? 'text-[#9ca3af]' : 'text-white font-medium'} text-sm`}>{s.books?.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {s.books?.medium && <span className={`text-xs px-1.5 py-0.5 rounded border ${MEDIUM_COLORS[s.books.medium] || ''}`}>{MEDIUM_LABELS[s.books.medium]}</span>}
                          {s.books?.category && <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[s.books.category] || 'border-[#2a2a45] text-[#6b7280]'}`}>{s.books.category}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${s.available_qty===0 ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-white'}`}>{s.available_qty}</span>
                        {s.total_qty > 0 && (
                          <div className="w-16 bg-[#2a2a45] rounded-full h-1 mt-1">
                            <div className={`h-1 rounded-full ${s.available_qty===0 ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.round((s.available_qty/s.total_qty)*100)}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm">{s.total_qty}</td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                            <AlertTriangle size={12} /> {s.available_qty===0 ? 'Out of stock' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400 font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setPreBook({ id: s.book_id, title: s.books?.title }); setAddBatchOpen(true) }}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-medium transition-all">
                              + Add
                            </button>
                            <button
                              onClick={() => { setEditing(s); setCorrectOpen(true) }}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                              Correct
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mob-cards space-y-3">
            {loading ? [...Array(3)].map((_,i)=>(
              <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-28"/>
            )) : filtered.length===0 ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No stock entries — tap Add Stock to get started</div>
            ) : filtered.map(s => {
              const isLow = s.available_qty <= s.low_stock_threshold
              return (
                <div key={s.id} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {(s.books?.exam_level || s.books?.unit || s.books?.part) && (
                        <p className="text-white font-semibold text-sm leading-snug">{[s.books.exam_level, s.books.unit, s.books.part].filter(Boolean).join(' › ')}</p>
                      )}
                      <p className={`${(s.books?.exam_level || s.books?.unit || s.books?.part) ? 'text-[#9ca3af]' : 'text-white font-semibold'} text-sm`}>{s.books?.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {s.books?.medium && <span className={`text-xs px-1.5 py-0.5 rounded border ${MEDIUM_COLORS[s.books.medium] || ''}`}>{MEDIUM_LABELS[s.books.medium]}</span>}
                        {s.books?.category && <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${CAT_COLORS[s.books.category] || 'border-[#2a2a45] text-[#6b7280]'}`}>{s.books.category}</span>}
                        {isLow ? (
                          <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={11}/> {s.available_qty===0 ? 'Out of stock' : 'Low stock'}</span>
                        ) : (
                          <span className="text-xs text-emerald-400">OK</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${s.available_qty===0 ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-white'}`}>{s.available_qty}</p>
                      <p className="text-[#6b7280] text-xs">available</p>
                    </div>
                  </div>
                  {s.total_qty > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-[#12121f] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${s.available_qty===0 ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.round((s.available_qty/s.total_qty)*100)}%` }} />
                      </div>
                      <p className="text-[#6b7280] text-xs mt-1">{s.total_qty} total received · {s.total_qty > 0 ? Math.round((s.available_qty/s.total_qty)*100) : 0}% remaining</p>
                    </div>
                  )}
                  {canEdit && (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button onClick={() => { setPreBook({ id: s.book_id, title: s.books?.title }); setAddBatchOpen(true) }}
                        className="text-xs py-2 rounded-lg bg-[#bd0a0a] hover:bg-[#a00909] text-white font-medium transition-all">
                        + Add Batch
                      </button>
                      <button onClick={() => { setEditing(s); setCorrectOpen(true) }}
                        className="text-xs py-2 rounded-lg bg-[#2a2a45] hover:bg-[#3a3a55] text-[#9ca3af] hover:text-white transition-all">
                        Correct Count
                      </button>
                    </div>
                  )}
                  <button onClick={() => setHistoryBook({ id: s.book_id, title: s.books?.title })}
                    className="w-full text-xs py-2 rounded-lg bg-[#12121f] border border-[#2a2a45] text-[#9ca3af] hover:text-white transition-all flex items-center justify-center gap-1">
                    <History size={11}/> View Full History
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
            <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
              placeholder="Search by book, recipient, user or type..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a45] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#bd0a0a] placeholder-[#4b5563]" />
          </div>

          {/* Desktop table */}
          <div className="mob-table bg-[#1a1a2e] border border-[#2a2a45] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#2a2a45]">
                  {['TYPE','BOOK','DETAILS','QTY','BY','DATE'].map(h=>(
                    <th key={h} className="text-left text-[#6b7280] text-xs font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a45]">
                {histLoading ? [...Array(6)].map((_,i)=>(
                  <tr key={i}>{[...Array(6)].map((_,j)=>(
                    <td key={j} className="px-5 py-3"><div className="h-4 bg-[#2a2a45] rounded animate-pulse"/></td>
                  ))}</tr>
                )) : filteredMov.length===0 ? (
                  <tr><td colSpan={6} className="text-center text-[#6b7280] py-10 text-sm">No movements found</td></tr>
                ) : filteredMov.map(m => {
                  const ts = TYPE_STYLES[m.type]
                  return (
                    <tr key={m.key} className={`hover:bg-[#12121f] transition-colors ${m.voided ? 'opacity-40' : ''}`}>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${ts.cls}`}>{ts.label}</span>
                        {m.voided && <p className="text-[#6b7280] text-xs mt-0.5">reversed/returned</p>}
                      </td>
                      <td className="px-5 py-3 text-white text-sm font-medium max-w-[160px] truncate">{m.book}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm max-w-[200px] truncate">{m.to}</td>
                      <td className="px-5 py-3 text-white text-sm">{m.qty}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm">{m.by}</td>
                      <td className="px-5 py-3 text-[#9ca3af] text-sm whitespace-nowrap">{format(new Date(m.date), 'dd MMM yy, hh:mm a')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mob-cards space-y-3">
            {histLoading ? [...Array(4)].map((_,i)=>(
              <div key={i} className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 animate-pulse h-20"/>
            )) : filteredMov.length===0 ? (
              <div className="bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-6 text-center text-[#6b7280] text-sm">No movements found</div>
            ) : filteredMov.map(m => {
              const ts = TYPE_STYLES[m.type]
              return (
                <div key={m.key} className={`bg-[#1a1a2e] border border-[#2a2a45] rounded-xl p-4 ${m.voided ? 'opacity-40' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ts.cls}`}>{ts.label}</span>
                      {m.voided && <span className="text-[#6b7280] text-xs">reversed/returned</span>}
                    </div>
                    <span className="text-[#6b7280] text-xs whitespace-nowrap">{format(new Date(m.date), 'dd MMM yy')}</span>
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{m.book}</p>
                  <p className="text-[#9ca3af] text-xs mb-1">{m.type === 'STOCK_IN' ? m.to : `→ ${m.to}`}</p>
                  <p className="text-[#6b7280] text-xs">qty {m.qty} · by {m.by} · {format(new Date(m.date), 'hh:mm a')}</p>
                </div>
              )
            })}
          </div>
        </>
      )}

      <AddBatchModal
        open={addBatchOpen}
        onClose={() => { setAddBatchOpen(false); setPreBook(null) }}
        onSave={handleAddBatch}
        allBooks={books}
        stock={stock}
        preBook={preBook}
      />
      <CorrectModal
        open={correctOpen}
        onClose={() => setCorrectOpen(false)}
        onSave={handleCorrect}
        editing={editing}
        allBooks={books}
      />
      <BookHistoryModal
        open={!!historyBook}
        onClose={() => setHistoryBook(null)}
        bookId={historyBook?.id}
        bookTitle={historyBook?.title}
      />
    </div>
  )
}
