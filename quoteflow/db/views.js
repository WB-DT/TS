const viewQueries = {
  v_quote_cycle_times: `
    WITH ordered_history AS (
      SELECT
        quote_id,
        to_status,
        changed_at,
        id,
        LEAD(changed_at) OVER (PARTITION BY quote_id ORDER BY changed_at, id) AS next_changed_at
      FROM quote_status_history
    ), stage_durations AS (
      SELECT
        q.id AS quote_id,
        CASE
          WHEN h.to_status IN ('Submitted', 'Qualifying', 'Needs info') THEN 'screening'
          WHEN h.to_status = 'Ready to assign' THEN 'waiting_to_assign'
          WHEN h.to_status IN ('Assigned', 'In progress', 'Returned to quoter') THEN 'quoting'
          WHEN h.to_status IN ('In revision', 'Returned to reviser') THEN 'final_review'
          WHEN h.to_status = 'Awaiting approval' THEN 'approval'
          ELSE 'other'
        END AS stage,
        CASE
          WHEN COALESCE(h.next_changed_at, q.updated_at) > h.changed_at
            THEN COALESCE(h.next_changed_at, q.updated_at) - h.changed_at
          ELSE 0
        END AS duration_seconds
      FROM quotes q
      LEFT JOIN ordered_history h ON h.quote_id = q.id
    )
    SELECT
      q.id AS quote_id,
      q.quote_number,
      q.status,
      COALESCE(SUM(CASE WHEN d.stage = 'screening' THEN d.duration_seconds ELSE 0 END), 0) AS screening_seconds,
      COALESCE(SUM(CASE WHEN d.stage = 'waiting_to_assign' THEN d.duration_seconds ELSE 0 END), 0) AS waiting_to_assign_seconds,
      COALESCE(SUM(CASE WHEN d.stage = 'quoting' THEN d.duration_seconds ELSE 0 END), 0) AS quoting_seconds,
      COALESCE(SUM(CASE WHEN d.stage = 'final_review' THEN d.duration_seconds ELSE 0 END), 0) AS final_review_seconds,
      COALESCE(SUM(CASE WHEN d.stage = 'approval' THEN d.duration_seconds ELSE 0 END), 0) AS approval_seconds,
      q.updated_at - q.created_at AS total_seconds
    FROM quotes q
    LEFT JOIN stage_durations d ON d.quote_id = q.id
    GROUP BY q.id, q.quote_number, q.status, q.created_at, q.updated_at
  `,
  v_quoter_workload: `
    SELECT
      u.id AS quoter_id,
      u.name AS quoter_name,
      u.email AS quoter_email,
      u.team,
      COUNT(q.id) AS open_quotes
    FROM users u
    LEFT JOIN quotes q
      ON q.assigned_quoter_id = u.id
      AND q.status NOT IN ('Approved', 'Declined', 'Sent to customer')
    WHERE u.role = 'Quoter' AND u.active = 1
    GROUP BY u.id, u.name, u.email, u.team
  `,
  v_reviser_outcomes: `
    SELECT
      u.id AS reviser_id,
      u.name AS reviser_name,
      u.email AS reviser_email,
      u.team,
      COUNT(q.id) AS decisions,
      SUM(CASE WHEN q.status IN ('Approved', 'Sent to customer') THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN q.status = 'Declined' THEN 1 ELSE 0 END) AS denied_count,
      SUM(CASE WHEN q.status IN ('Returned to quoter', 'Returned to reviser') THEN 1 ELSE 0 END) AS changes_requested_count,
      CASE WHEN COUNT(q.id) = 0 THEN 0 ELSE SUM(CASE WHEN q.status IN ('Approved', 'Sent to customer') THEN 1 ELSE 0 END) * 100.0 / COUNT(q.id) END AS approved_rate_percent,
      CASE WHEN COUNT(q.id) = 0 THEN 0 ELSE SUM(CASE WHEN q.status = 'Declined' THEN 1 ELSE 0 END) * 100.0 / COUNT(q.id) END AS denied_rate_percent,
      CASE WHEN COUNT(q.id) = 0 THEN 0 ELSE SUM(CASE WHEN q.status IN ('Returned to quoter', 'Returned to reviser') THEN 1 ELSE 0 END) * 100.0 / COUNT(q.id) END AS changes_requested_rate_percent
    FROM users u
    LEFT JOIN quotes q
      ON q.final_reviewer_id = u.id
      AND q.status IN ('Approved', 'Sent to customer', 'Declined', 'Returned to quoter', 'Returned to reviser')
    WHERE u.role = 'Reviser' AND u.active = 1
    GROUP BY u.id, u.name, u.email, u.team
  `,
  v_ocr_accuracy: `
    SELECT
      extracted.template,
      extracted.field_name,
      COUNT(DISTINCT extracted.id) AS extracted_field_count,
      COUNT(DISTINCT edits.extracted_field_id) AS edited_field_count,
      CASE
        WHEN COUNT(DISTINCT extracted.id) = 0 THEN 0
        ELSE COUNT(DISTINCT edits.extracted_field_id) * 100.0 / COUNT(DISTINCT extracted.id)
      END AS edited_percent,
      CASE
        WHEN COUNT(DISTINCT extracted.id) = 0 THEN 0
        ELSE 100.0 - COUNT(DISTINCT edits.extracted_field_id) * 100.0 / COUNT(DISTINCT extracted.id)
      END AS unchanged_percent
    FROM quote_extracted_fields extracted
    LEFT JOIN field_edits edits ON edits.extracted_field_id = extracted.id
    WHERE extracted.original_value IS NOT NULL AND extracted.original_value <> ''
    GROUP BY extracted.template, extracted.field_name
  `,
};

async function installViews(knex) {
  const sqlServer = knex.client.config.client === "mssql";
  for (const [name, selectSql] of Object.entries(viewQueries)) {
    if (sqlServer) {
      await knex.raw(`IF OBJECT_ID('${name}', 'V') IS NOT NULL DROP VIEW ${name}`);
    } else {
      await knex.raw(`DROP VIEW IF EXISTS ${name}`);
    }
    await knex.raw(`CREATE VIEW ${name} AS ${selectSql}`);
  }
}

module.exports = { installViews, viewQueries };
