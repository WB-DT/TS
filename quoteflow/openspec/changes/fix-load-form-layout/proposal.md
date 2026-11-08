# Fix the Load Form layout

## Why

The Load Form export is the file the quoter uploads to the customer's account. Today it does not match the Load Form tab of the color key:

- It writes "1" into column C, "0" into column J and "N" into column O. The key leaves these columns blank.
- The export asks for the contract owner but fills in a placeholder when none is given, so the file can go out with a made-up owner.

Fixing this is first in the plan because the Tuesday demo shows the Load Form.

## What changes

- The export writes the 18 columns of the key's Load Form tab. Columns C, J and L to Q stay blank.
- Contract owner is a required answer. The placeholder is removed, and the error message names it.
- The Load Form modal starts the contract owner field empty and marks it required.

## Out of scope

- Post-approval flow, Lock-In file and favorites export (later changes).
- Moving the export out of stage 5 (later change).
- Changing the seven questionnaire fields beyond contract owner.
