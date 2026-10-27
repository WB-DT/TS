JavaScript
/**
* ACT CRM Stage 1
* Central application state
*
* This module stores temporary interface state while the application is open.
* It must not be used as the authoritative source for permissions or CRM data.
*/
 
const initialState = {
currentUser: null,
selectedAccountId: null,
selectedAccount: null,
communications: [],
followUps: [],
permissions: {},
ui: {
activeView: "communication-overview",
loading: false,
error: null
}
};
 
let applicationState = structuredClone(initialState);
 
/**
* Returns a safe copy of the current application state.
*/
export function getState() {
return structuredClone(applicationState);
}
 
/**
* Updates approved portions of the application state.
*
* @param {Object} changes State values that need to be updated.
*/
export function updateState(changes) {
applicationState = {
...applicationState,
...changes,
ui: {
...applicationState.ui,
...(changes.ui || {})
}
};
 
document.dispatchEvent(
new CustomEvent("act:state-change", {
detail: getState()
})
);
}
 
/**
* Clears the current account context.
*/
export function clearSelectedAccount() {
updateState({
selectedAccountId: null,
selectedAccount: null,
communications: [],
followUps: []
});
}
 
/**
* Returns the application to its original runtime state.
*/
export function resetState() {
applicationState = structuredClone(initialState);
 
document.dispatchEvent(
new CustomEvent("act:state-change", {
detail: getState()
})
);
}
