// Shared, high-contrast Hindi/English/Both badge — used everywhere a book
// list is shown so two books sharing an identical title (one per medium)
// can't be mixed up at a glance, e.g. in the distributor "Allot Books" and
// "Take Back" pickers, which list all mediums together unfiltered.

const STYLES = {
  hindi:   { bg: 'bg-[#bd0a0a]', text: 'text-white', label: 'HINDI' },
  english: { bg: 'bg-[#f0a500]', text: 'text-black', label: 'ENGLISH' },
  both:    { bg: 'bg-teal-600',  text: 'text-white', label: 'H + E' },
}

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
}

export default function MediumBadge({ medium, size = 'md', className = '' }) {
  const s = STYLES[medium]
  if (!s) return null
  return (
    <span className={`inline-flex items-center font-bold rounded ${s.bg} ${s.text} ${SIZES[size] || SIZES.md} ${className}`}>
      {s.label}
    </span>
  )
}

export function mediumRowClass(medium) {
  if (medium === 'hindi') return 'border-l-4 border-l-[#bd0a0a]'
  if (medium === 'english') return 'border-l-4 border-l-[#f0a500]'
  if (medium === 'both') return 'border-l-4 border-l-teal-600'
  return ''
}
