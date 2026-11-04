# Eval run 202611041523-glossary-links

50 requests per model, run 2026-11-04T15:28:23.450Z. A request is correct when every check that applies passes and the reply has no invented ₦ amounts.

| Model | Correct | Tool | Filters | Query | Cart | Behavior | Invented ₦ | Median | p90 | Errors |
|---|---|---|---|---|---|---|---|---|---|---|
| Muse Spark Open | **100% (50/50)** | 100% (50/50) | 100% (31/31) | 100% (31/31) | 100% (8/8) | 100% (4/4) | 0 | 4.9s | 8.5s | 0 |

## By language and category

| Model | English | Pidgin | Food | Grocery | Status |
|---|---|---|---|---|---|
| Muse Spark Open | 100% (25/25) | 100% (25/25) | 100% (20/20) | 100% (20/20) | 100% (10/10) |

## Tokens

| Model | Prompt | of which cached | Completion | of which reasoning |
|---|---|---|---|---|
| Muse Spark Open | 350k | 212k | 28k | 18k |

## Failures


Rows: `select * from eval_runs where run_id = '202611041523-glossary-links'`
