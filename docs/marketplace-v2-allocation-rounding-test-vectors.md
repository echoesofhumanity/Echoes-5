# Marketplace V2 — EC allocation rounding test vectors

Status: static arithmetic review only; NOT a database or end-to-end test.
Illustrative policy only: seller 7000 bps, humanitarian 2700 bps, operating 300 bps. These percentages are NOT approved.

## Deterministic integer algorithm
For each seller's gross integer EC amount G:
- operating = floor(G * operating_bps / 10000)
- humanitarian = floor(G * humanitarian_bps / 10000)
- seller = G - operating - humanitarian
- require bps are nonnegative, sum to 10000, operating_bps <= 300
- require G > 0, G <= 9007199254740991
- require seller + humanitarian + operating = G
- require operating * 10000 <= G * 300
- use PostgreSQL numeric for intermediate multiplication; never JavaScript Number for high values

## Independent integer arithmetic vectors
| Gross EC | Seller | Humanitarian | Operating |
|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 |
| 2 | 2 | 0 | 0 |
| 3 | 3 | 0 | 0 |
| 10 | 8 | 2 | 0 |
| 33 | 25 | 8 | 0 |
| 34 | 24 | 9 | 1 |
| 99 | 71 | 26 | 2 |
| 100 | 70 | 27 | 3 |
| 101 | 71 | 27 | 3 |
| 333 | 235 | 89 | 9 |
| 1000 | 700 | 270 | 30 |
| 9007199254740991 | 6305039478318695 | 2431943798780067 | 270215977642229 |

These 12 vectors were checked with exact integer arithmetic; not with PostgreSQL.

## Multi-seller test case
Seller A gross 34 EC -> seller 24, humanitarian 9, operating 1.
Seller B gross 101 EC -> seller 71, humanitarian 27, operating 3.
Order gross 135 EC -> seller 95, humanitarian 36, operating 4.
Allocate PER SELLER before summing. Do not round order total and redistribute; the results can differ.

## Activation blockers
1. Approve a versioned economic allocation policy; the SQL policy variables deliberately remain NULL.
2. Test alternative policies including 0 operating bps and 300 operating bps, plus rounding edge cases.
3. Verify PostgreSQL numeric/bigint casting and SQL function execution in isolated staging only after explicit approval.
4. Confirm seller-specific gross sums match immutable line snapshots.
5. Ensure no fiat settlement or real financial liability is inferred from synthetic allocations.
