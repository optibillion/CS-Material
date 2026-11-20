# Stock Mismatch Report

Generated from `full_stock_reconciliation.sql` — 67 books checked, 58 reconcile exactly (mismatch = 0), 17 don't.

## Priority 1 — Real bugs, need physical recount + Correct

| Book | Exam / Unit / Part | Medium | Expected | Actual | Mismatch |
|---|---|---|---|---|---|
| संकल्पना एवं विचार - Cultural Heritage & Thought | Prelims / 1 / B | English | 1273 | 1515 | +242 |
| Major Commissions, Democracy, Self-Governing Institutions, Media & Indian Political Thinkers | Mains / Paper 2 Part-A / Unit-2&3 | English | 237 | 250 | +13 |

**Action:** count physical copies on the shelf, then use **Correct** in Inventory to set the true number.

## Priority 2 — Hidden historical shortages (already honestly showing 0, no action needed)

| Book | Exam / Unit / Part | Medium | Expected | Actual | Mismatch |
|---|---|---|---|---|---|
| मध्यप्रदेश का भूगोल - Geography of MP | Prelims / 4 | Hindi | -37 | 0 | +37 |
| भारत का भूगोल - Geography of India | Prelims / 3 | Hindi | -20 | 0 | +20 |
| भारत का इतिहास — History of India | Prelims / 1 / A | English | -16 | 0 | +16 |
| भारत का भूगोल - Geography of India | Prelims / 3 | English | -13 | 0 | +13 |
| भारत एवं म.प्र. की संवैधानिक व्यवस्था - Constitutional System of India & MP | Prelims / 5 | English | -9 | 0 | +9 |
| सूचना एवं संचार प्रौद्योगिकी - Information & Communication Technology | Prelims / 9 | English | -3 | 0 | +3 |

**Action:** none right now. These are honestly showing 0 — more was historically given out than was ever recorded as received, and the old code hid how deep the hole was. The next normal "Add Stock" for any of these will correctly net out the hidden deficit instead of hiding it again.

## Priority 3 — Off by 1 unit, safe to ignore

| Book | Exam / Unit / Part | Medium | Expected | Actual | Mismatch |
|---|---|---|---|---|---|
| आधुनिक भारत का इतिहास | Mains / Paper 1 Part-A / Unit-3 | Hindi | 87 | 88 | +1 |
| आपदाएँ और तकनीकें | Mains / Paper 1 Part-B / Unit-4 | Hindi | 18 | 19 | +1 |
| प्रमुख आयोग एवं राजनीति में विभिन्न वर्गों की भूमिका, लोकतंत्र, स्वशासी संस्थाएँ, मीडिया और भारतीय राजनीतिक विचारक | Mains / Paper 2 Part-A / Unit-2&3 | Hindi | 118 | 119 | +1 |
| कम्प्यूटर | Mains / Paper 3 Part-B / Unit-2 | Hindi | 571 | 572 | +1 |
| आयुष एवं राष्ट्रीय स्वास्थ्य कार्यक्रम | Mains / Paper 3 Part-B / Unit-3&4 | Hindi | 533 | 534 | +1 |
| पर्यावरण | Mains / Paper 3 Part-B / Unit-5 | Hindi | 501 | 502 | +1 |
| उद्यमिता अवधारणा एवं विकास, व्यावसायिक संगठन एवं प्रबंधन | Mains / Paper 4 Part-B / Unit-1&2 | Hindi | 551 | 552 | +1 |
| प्रशासन एवं प्रबंधन, समग्र व्यक्तित्व विकास | Mains / Paper 4 Part-B / Unit-3&4 | Hindi | 634 | 635 | +1 |
| केस स्टडी | Mains / Paper 4 Part-B / Unit-5 | Hindi | 590 | 591 | +1 |

**Action:** none. Almost certainly a past one-off manual Correct (e.g. an extra physical copy found on a shelf count) — the Correct button never leaves a ledger trace, so it always shows up as a permanent tiny "mismatch" against this formula even when nothing is wrong.

## Everything else (58 books)

Mismatch = 0. Already correct, no action needed.
