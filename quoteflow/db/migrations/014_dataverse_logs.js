exports.config = { transaction: false };

// Copies of the client's Dataverse tables, using their exact table and column names,
// so QuoteFlow can switch from an Excel export to the live Dataverse data later.
// QuoteFlow only READS these logs; nothing is written back to Dataverse.

const QUOTE_LOG_COLUMNS = [
  "createdon", "modifiedon", "createdbyname", "modifiedbyname", "owneridyominame",
  "cr714_recordkey", "cr714_asapapprovingmanager", "cr714_asapnotes", "cr714_assignedto",
  "cr714_attachment", "cr714_attachmentcount", "cr714_category", "cr714_companyname",
  "cr714_competitor", "cr714_completiontime", "cr714_customernumber", "cr714_customerorlead",
  "cr714_dateassigned", "cr714_datequalified", "cr714_datereturnedorkilled", "cr714_datesentforrevision",
  "cr714_grossprofitpercent", "cr714_hasattachment", "cr714_hasattachmentname", "cr714_itemstoquote",
  "cr714_lockedindate", "cr714_multiplier", "cr714_numberofchanges", "cr714_oldquotenumber", "cr714_ppl",
  "cr714_qualifierquoternotes", "cr714_quotenumber", "cr714_requestnotes", "cr714_requestpriority",
  "cr714_revisionnotes", "cr714_sentforrevision", "cr714_sentforrevisionname", "cr714_sourcefile",
  "cr714_sourceid", "cr714_sourcemodifiedon", "cr714_sourcesheet", "cr714_starttime",
  "cr714_submitteremail", "cr714_submittername", "cr714_submittingagentrole", "cr714_totalitemsquoted",
  "cr714_wbsellpricetotal", "cr714_wbsellpricetotal_base",
];

const MDM_LOG_COLUMNS = [
  "createdon", "modifiedon", "createdbyname", "modifiedbyname", "owneridname", "owneridyominame",
  "cr714_recordkey", "cr714_accountnumber", "cr714_amountawarded", "cr714_amountawarded_base",
  "cr714_assignedto", "cr714_bidduedate", "cr714_bidnotes", "cr714_branchwarehouse", "cr714_category",
  "cr714_competitor", "cr714_completedquoteattachment", "cr714_completedquoteattachmentcount",
  "cr714_completionnotes", "cr714_completiontime", "cr714_dateassigned", "cr714_datelockedin",
  "cr714_daterevised", "cr714_datesentbacktorepmdm", "cr714_datesentforrevision", "cr714_disposition",
  "cr714_fraudcheckcomplete", "cr714_fraudcheckcompletename", "cr714_fraudnotes", "cr714_grossprofitpercent",
  "cr714_hasanyattachment", "cr714_hasanyattachmentname", "cr714_hascompletedquoteattachment",
  "cr714_hascompletedquoteattachmentname", "cr714_hasrequestattachment", "cr714_hasrequestattachmentname",
  "cr714_isquoteneeded", "cr714_isquoteneededname", "cr714_itemsawarded", "cr714_itemstoquote",
  "cr714_mdmduedate", "cr714_multiplier", "cr714_numberofchanges", "cr714_ppl", "cr714_quoter",
  "cr714_quoterduedate", "cr714_requestattachment", "cr714_requestattachmentcount", "cr714_requestnotes",
  "cr714_requestorname", "cr714_requestsource", "cr714_revisedby", "cr714_sentinsentout", "cr714_sourcefile",
  "cr714_sourceid", "cr714_sourcemodifiedon", "cr714_sourcesheet", "cr714_starttime", "cr714_submitteremail",
  "cr714_submittername", "cr714_totalattachmentcount", "cr714_totalitemsquotedbid", "cr714_wbsellpricetotal",
  "cr714_wbsellpricetotal_base",
];

async function createLogTable(knex, tableName, idColumn, columns) {
  if (await knex.schema.hasTable(tableName)) return;
  await knex.schema.createTable(tableName, (table) => {
    table.string(idColumn, 64).primary();
    for (const column of columns) table.text(column);
    table.integer("qf_imported_at").notNullable();
    table.string("qf_row_hash", 64).notNullable();
  });
}

exports.up = async function up(knex) {
  await createLogTable(knex, "cr714_quotelog", "cr714_quotelogid", QUOTE_LOG_COLUMNS);
  await createLogTable(knex, "cr714_mdmlog", "cr714_mdmlogid", MDM_LOG_COLUMNS);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("cr714_quotelog");
  await knex.schema.dropTableIfExists("cr714_mdmlog");
};
