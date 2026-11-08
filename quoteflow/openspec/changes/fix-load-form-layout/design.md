# Design: Fix the Load Form layout

## Source of truth

The column layout comes from the Load Form tab of the color key workbook, not from the code. The key lists 18 columns A to R. Blank columns are C, J, L, M, N, O, P and Q.

| Column | Field | Source |
| --- | --- | --- |
| A | Contract number | Questionnaire (PPL) |
| B | Description | Questionnaire |
| C | blank | none |
| D | Start date | Questionnaire, written as M/D/YYYY |
| E | End date | Questionnaire, written as M/D/YYYY |
| F | Contract type | Questionnaire |
| G | Classification | Questionnaire |
| H | Item number | Approved line |
| I | UOM | Approved line |
| J | blank | none |
| K | Net price | Approved line sell price, rounded to the cent |
| L to Q | blank | none |
| R | Contract owner | Questionnaire |

## Decisions

1. **Blank means empty, not a default.** The old code wrote "1", "0" and "N" into blank columns. The key says to leave them blank, so the code writes empty cells.
2. **Contract owner is required.** The questionnaire asks the quoter for it, so the export refuses to build the file without it. The placeholder value is removed.
3. **Only the seven questionnaire fields are asked.** Blank columns are never shown to the quoter.
4. **Favorites name is not in this file.** It is free text on the questionnaire and is not written to the Load Form.

## Files touched

- `quote-stages.js`: `loadFormRows` (row layout) and the load form export route (required fields and message).
- `public/quote-stages-page.js`: the contract owner input in the Load Form modal.
- `test/load-form.test.js`: new tests for the row layout.

## Not changed

Styling, the other stages, pricing, and the cross-reference logic.
