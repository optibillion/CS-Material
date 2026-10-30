// Resolves a book's effective MRP from book_price_history rows as of a
// given moment — a row with effective_from in the future is invisible
// to this lookup until that date arrives, which is what lets a price
// change be scheduled ahead of time instead of applying immediately.

export function effectivePrice(historyRows, bookId, asOf = new Date()) {
  let best = null
  for (const row of historyRows) {
    if (row.book_id !== bookId) continue
    const effFrom = new Date(row.effective_from)
    if (effFrom > asOf) continue
    if (!best || effFrom > new Date(best.effective_from)) best = row
  }
  return best
}

export function effectiveMrp(historyRows, bookId, asOf = new Date()) {
  return effectivePrice(historyRows, bookId, asOf)?.mrp ?? null
}

// Earliest not-yet-active price scheduled for this book, if any.
export function upcomingPrice(historyRows, bookId, asOf = new Date()) {
  let best = null
  for (const row of historyRows) {
    if (row.book_id !== bookId) continue
    const effFrom = new Date(row.effective_from)
    if (effFrom <= asOf) continue
    if (!best || effFrom < new Date(best.effective_from)) best = row
  }
  return best
}
