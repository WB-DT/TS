const templates = [
  { key: "invoice", label: "Invoice" },
  { key: "receipt", label: "Receipt" },
  { key: "image", label: "Image/Screenshot" },
  { key: "full", label: "Full detail" },
];

const allTemplates = templates.map((template) => template.key);
const invoiceAndImage = ["invoice", "image", "full"];
const fields = [
  { key: "quoteId", label: "Quote ID", definition: "A unique reference generated for this quote draft.", group: "header", templates: allTemplates },
  { key: "accountNumber", label: "Account number", definition: "The customer account number, taken from the filename and checked against text recognized in the document.", group: "header", templates: allTemplates },
  { key: "accountName", label: "Account name", definition: "The customer name taken from the filename and checked against text recognized in the document.", group: "header", templates: allTemplates },
  { key: "invoiceSource", label: "Invoice source", definition: "The vendor or competitor name shown on the source document.", azureFields: ["VendorName"], group: "header", templates: allTemplates },
  { key: "invoiceDate", label: "Invoice date", definition: "The date printed on the invoice. Leave blank when it is not present.", azureFields: ["InvoiceDate"], group: "header", templates: allTemplates },
  { key: "uploadDate", label: "Upload date", definition: "The date this source file was uploaded.", group: "header", templates: allTemplates },
  { key: "uploadedBy", label: "Uploaded by", definition: "The signed-in Quoter who uploaded this source file.", group: "header", templates: allTemplates },
  { key: "contractPricing", label: "Contract pricing", definition: "Whether the document text mentions a contract or contractual pricing.", group: "header", templates: allTemplates },
  { key: "itemLineCount", label: "Item line count", definition: "The number of purchasable line items recognized in the source document.", azureFields: ["Items"], group: "header", templates: allTemplates },
  { key: "duplicateWarning", label: "Duplicate warning", definition: "Warns when this exact file has already been uploaded for the same account.", group: "header", templates: allTemplates },
  { key: "accountMismatch", label: "Account match", definition: "Compares the filename account number and name with account details recognized in the document.", group: "header", templates: allTemplates },

  { key: "competitorItemNumber", label: "Competitor item #", definition: "The item or product code printed by the competitor or vendor.", azureFields: ["ProductCode", "ItemCode", "SKU"], group: "line", templates: invoiceAndImage },
  { key: "manufacturerPartNumber", label: "Manufacturer part #", definition: "The manufacturer's part number, when it is explicitly present on the source.", azureFields: ["ManufacturerPartNumber", "PartNumber"], group: "line", templates: ["invoice", "full"] },
  { key: "brand", label: "Brand", definition: "The product brand printed in the item description or product details.", azureFields: ["Brand", "ManufacturerName"], group: "line", templates: invoiceAndImage },
  { key: "description", label: "Description", definition: "The item description exactly as written in the source document.", azureFields: ["Description"], group: "line", templates: allTemplates },
  { key: "descriptionSummary", label: "Description summary", definition: "A short plain-English version of the description. This is a draft summary and should be reviewed.", group: "line", templates: allTemplates },
  { key: "unitOfMeasure", label: "Unit of measure", definition: "The package or sale unit used by the source, such as each, pair, dozen, or case.", azureFields: ["Unit"], group: "line", templates: allTemplates },
  { key: "countPerUnit", label: "Count per unit", definition: "The number of individual items in one unit of measure. Common word conversions include dozen = 12, pair = 2, and gross = 144.", group: "line", templates: allTemplates },
  { key: "pricePerUnitOfMeasure", label: "Price per unit of measure", definition: "The price for one source unit of measure, such as one box or one dozen.", azureFields: ["UnitPrice"], group: "line", templates: allTemplates },
  { key: "quantityPurchased", label: "Quantity purchased", definition: "The number of source units purchased.", azureFields: ["Quantity"], group: "line", templates: allTemplates },
  { key: "extendedPrice", label: "Extended price", definition: "The total price for this line item after multiplying unit price by quantity.", azureFields: ["Amount"], group: "line", templates: allTemplates },
  { key: "normalizedUnitPrice", label: "Normalized unit price", definition: "Price per single item, calculated as price per unit of measure divided by count per unit.", group: "line", templates: allTemplates },
  { key: "sourcePageLine", label: "Source page/line", definition: "The page and nearest recognized text line where this item appears.", group: "line", templates: allTemplates },
  { key: "soldBy", label: "Sold by", definition: "The marketplace seller shown on the source, when the item is sold by a third party.", azureFields: ["SoldBy", "SellerName", "MarketplaceSeller"], group: "line", templates: allTemplates },

  { key: "tax", label: "Tax", definition: "Tax amount shown on the invoice or receipt.", azureFields: ["TotalTax", "Tax"], group: "detail", templates: ["full"] },
  { key: "shipping", label: "Shipping", definition: "Shipping or freight charges shown on the invoice or receipt.", azureFields: ["ShippingCharges", "Freight", "Shipping"], group: "detail", templates: ["full"] },
  { key: "fees", label: "Fees", definition: "Other fees shown separately from item prices, tax, and shipping.", azureFields: ["Fees", "ServiceCharge"], group: "detail", templates: ["full"] },

  { key: "submitterRole", label: "Submitter role", definition: "The role you are working in for this request. Your last choice is remembered on this device.", group: "request", templates: allTemplates },
  { key: "requestType", label: "Request type", definition: "Existing customer is an active account; Lead is a prospective customer; Win-back is a previous customer you are trying to regain.", group: "request", templates: allTemplates },
  { key: "requestAccountNumber", label: "Customer number", definition: "Existing customer and Win-back requests must include an account number beginning with C.", group: "request", templates: allTemplates },
  { key: "requestCompanyName", label: "Company name", definition: "The customer or prospective company that needs a quote.", group: "request", templates: allTemplates },
  { key: "customerNeeds", label: "What the customer needs", definition: "Describe the products, quantities, requirements, and context the Quoter needs to prepare a useful response.", group: "request", templates: allTemplates },
  { key: "shipCity", label: "Ship-to city", definition: "The destination city used to check nearby warehouse stock.", group: "request", templates: allTemplates },
  { key: "shipState", label: "Ship-to state", definition: "The destination state used to check nearby warehouse stock.", group: "request", templates: allTemplates },
  { key: "shipZip", label: "Ship-to ZIP", definition: "The destination ZIP code used to check nearby warehouse stock.", group: "request", templates: allTemplates },
  { key: "pplId", label: "PPL", definition: "The specified folder that holds the new quoted pricing on the account.", group: "request", templates: allTemplates },
  { key: "priority", label: "Priority", definition: "Standard uses the configured lead time. ASAP requests need a future deadline and an approving sales manager.", group: "request", templates: allTemplates },
  { key: "neededBy", label: "Needed by", definition: "The future date by which the customer needs the quote or goods.", group: "request", templates: allTemplates },
  { key: "asapReason", label: "ASAP reason", definition: "The business reason the request needs expedited handling.", group: "request", templates: allTemplates },
  { key: "asapItems", label: "ASAP items", definition: "Identify which products or lines require expedited handling.", group: "request", templates: allTemplates },
  { key: "asapApprovedBy", label: "Approving sales manager", definition: "The sales manager approving this expedited request. Reps are limited to their assigned manager.", group: "request", templates: allTemplates },
  { key: "notes", label: "Notes", definition: "Additional context for the Quoter. Required when the ASAP reason is Other.", group: "request", templates: allTemplates },
  { key: "requestFiles", label: "Files", definition: "Supporting customer files such as PDF, image, Excel, or Word documents.", group: "request", templates: allTemplates },
  { key: "requesterName", label: "Your name", definition: "Your display name from the signed-in work account.", group: "request", templates: allTemplates },
  { key: "requesterEmail", label: "Your email", definition: "Your email address from the signed-in work account.", group: "request", templates: allTemplates },
  { key: "quoteType", label: "Team", definition: "Quotes team produces customer quotes numbered Q-000001; MDM handles item master work numbered MDM-000001.", group: "request", templates: allTemplates },

  { key: "accountPrice", label: "Account price", definition: "The customer's current price from the Account price report.", group: "pricing", templates: allTemplates },
  { key: "financialCost", label: "Financial cost", definition: "The lowest above-zero cost across the costing, account, converted, and house cost rules. Blank for cost-exempt prefixes.", group: "pricing", templates: allTemplates },
  { key: "costSource", label: "Cost source", definition: "Which cost rule produced the financial cost: costing-direct, account-cost, converted, house-cost, none, or exempt.", group: "pricing", templates: allTemplates },
  { key: "currentMargin", label: "Current margin", definition: "(Account price − cost) ÷ account price.", group: "pricing", templates: allTemplates },
  { key: "targetMargin", label: "Target margin", definition: "The margin you want to achieve on this line. Defaults from settings and is editable per line.", group: "pricing", templates: allTemplates },
  { key: "priceAtTarget", label: "Price at target", definition: "ROUNDUP(cost ÷ (1 − target margin), 2).", group: "pricing", templates: allTemplates },
  { key: "deviationNeeded", label: "Deviation needed", definition: "Yes when the winning cost is below the account cost and equals the house cost.", group: "pricing", templates: allTemplates },
  { key: "ctlgePrice", label: "CTLGE price", definition: "The CTLGE price from the Costing report.", group: "pricing", templates: allTemplates },
  { key: "finalPrice", label: "Final price", definition: "The sell price you confirm for the line. Changes are logged to the edit audit.", group: "pricing", templates: allTemplates },
  { key: "unavailable", label: "Unavailable", definition: "Mark the line as unavailable so it is not quoted.", group: "pricing", templates: allTemplates },
  { key: "lineComment", label: "Line comment", definition: "A note about this line for the customer or internal review.", group: "pricing", templates: allTemplates },

  { key: "statusQualifying", label: "Qualifying", definition: "A Qualifier is screening the submission for completeness and fit.", group: "status", templates: allTemplates },
  { key: "statusNeedsInfo", label: "Needs info", definition: "The Qualifier needs more information from the Rep before the quote can proceed. The clock is paused.", group: "status", templates: allTemplates },
  { key: "statusInRevision", label: "In revision", definition: "The quote is with a Reviser for review.", group: "status", templates: allTemplates },
  { key: "statusAwaitingApproval", label: "Awaiting approval", definition: "The quote is waiting for a final decision from a Manager or a Reviser with the Can approve permission.", group: "status", templates: allTemplates },
  { key: "statusSentToCustomer", label: "Sent to customer", definition: "The Rep has sent the approved quote to the customer.", group: "status", templates: allTemplates },
  { key: "statusDeclined", label: "Declined", definition: "The submission was declined during screening. A reason is required.", group: "status", templates: allTemplates },
  { key: "statusReturnedToQuoter", label: "Returned to quoter", definition: "The Reviser sent the quote back to the Quoter for changes. A reason is required.", group: "status", templates: allTemplates },
  { key: "statusReturnedToReviser", label: "Returned to reviser", definition: "The approver sent the quote back to the Reviser. A note is required.", group: "status", templates: allTemplates },

  { key: "editReason", label: "Edit reason", definition: "Why a value was changed: wrong item match, wrong unit of measure, pricing error, missed item, better price available, formatting, or other.", group: "pricing", templates: allTemplates },
  { key: "coachingOpportunity", label: "Coaching opportunity", definition: "Flag an edit as a coaching moment for the person who did the work, with a category.", group: "pricing", templates: allTemplates },
  { key: "visibleToRep", label: "Visible to rep", definition: "Whether this comment is visible to the submitting Rep.", group: "request", templates: allTemplates },

  { key: "userName", label: "Name", definition: "The user's display name, shown across the workspace.", group: "users", templates: allTemplates },
  { key: "userEmail", label: "Work email", definition: "The user's sign-in email address. Each email can be registered once.", group: "users", templates: allTemplates },
  { key: "userRoles", label: "Roles", definition: "The roles the user holds. One person can hold several roles and switches between them in the sidebar. Only Managers can change roles, the workspace must always have at least one active Manager, and a Manager can't remove their own Manager role.", group: "users", templates: allTemplates },
  { key: "userTeam", label: "Team", definition: "The organizational team: Quotes or MDM.", group: "users", templates: allTemplates },
  { key: "userStatus", label: "Status", definition: "Active users can sign in and receive work. Deactivated users can't sign in, and their open quotes show on the Manager home dashboard as needing reassignment. Users are never deleted, so their history stays.", group: "users", templates: allTemplates },
  { key: "canApprove", label: "Can approve", definition: "Permission to approve quotes from the Approval queue. Managers have it by default; a Manager can also give it to a Reviser. The person who revised a quote cannot also approve it.", group: "users", templates: allTemplates },
  { key: "lastSignIn", label: "Last sign-in", definition: "The most recent time the user signed in.", group: "users", templates: allTemplates },
  { key: "userChangeHistory", label: "Change history", definition: "Audit log of user and role changes: who changed what, the old value, the new value, and when.", group: "users", templates: allTemplates },
];

function fieldsForTemplate(templateKey) {
  const selectedTemplate = templates.some((template) => template.key === templateKey)
    ? templateKey
    : "invoice";
  return {
    template: templates.find((template) => template.key === selectedTemplate),
    fields: fields.filter((field) => field.templates.includes(selectedTemplate)),
    headerFields: fields.filter((field) => field.group === "header" && field.templates.includes(selectedTemplate)),
    lineItemFields: fields.filter((field) => field.group === "line" && field.templates.includes(selectedTemplate)),
    detailFields: fields.filter((field) => field.group === "detail" && field.templates.includes(selectedTemplate)),
    requestFields: fields.filter((field) => field.group === "request" && field.templates.includes(selectedTemplate)),
  };
}

module.exports = { templates, fields, fieldsForTemplate };
