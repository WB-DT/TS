/**
 * ACT CRM Stage 1
 * Communication form component
 *
 * Responsibilities:
 * - Read communication form values
 * - Apply conditional field behavior
 * - Validate the proposed communication
 * - Display accessible field-level errors
 * - Emit a submission event after client-side validation passes
 *
 * This component must not:
 * - Save records directly
 * - Store CRM data in localStorage
 * - Determine authorization
 * - Treat client-side validation as authoritative
 */

import {
  validateCommunicatio*
} from "../validation.js";

impor* {
  setSafeText
} from "../securi*y.js";

const FOLLOW_UP_OUTCOME = *FOLLOW_UP_REQUIRED";

/**
 * Reads*a trimmed string from a form contr*l.
 *
 * @param {FormData} formDat*
 * @param {string} fieldName
 * @*eturns {string}
 */
function getTe*tValue(formData, fieldName) {
  co*st value = formData.get(fieldName)*

  return typeof value === "strin*"
    ? value.trim()
    : "";
}

***
 * Creates a communication obje*t from the form.
 *
 * @param {HTM*FormElement} form
 * @param {strin*|null} selectedAccountId
 * @retur*s {Object}
 */
function createComm*nicationDraft(
  form,
  selectedA*countId
) {
  const formData = new*FormData(form);

  const durationV*lue = getTextValue(
    formData,
*   "durationMinutes"
  );

  retur* {
    accountId: selectedAccountI* || "",
    contactId: getTextValu*(
      formData,
      "contactId*
    ),
    type: getTextValue(
  *   formData,
      "type"
    ).to*pperCase(),
    direction: getText*alue(
      formData,
      "direc*ion"
    ).toUpperCase(),
    outc*meCode: getTextValue(
      formDa*a,
      "outcomeCode"
    ).toUpp*rCase(),
    durationMinutes:
    * durationValue === ""
        ? nu*l
        : Number(durationValue),*    notes: getTextValue(
      for*Data,
      "notes"
    ),
    fol*owUpRequired:
      formData.get("*ollowUpRequired") === "true",
    *ollowUpDate: getTextValue(
      f*rmData,
      "followUpDate"
    )*
    followUpOwnerId: getTextValue*
      formData,
      "followUpOw*erId"
    )
  };
}

/**
 * Returns*the current selected account ID fr*m the form.
 *
 * The application *ayer will update this value after *he API
 * confirms that the user m*y access the selected account.
 *
** @param {HTMLFormElement} form
 **@returns {string|null}
 */
functio* getSelectedAccountId(form) {
  co*st accountId =
    form.dataset.se*ectedAccountId;

  return accountI*
    ? String(accountId)
    : nul*;
}

/**
 * Clears all existing va*idation messages.
 *
 * @param {HT*
