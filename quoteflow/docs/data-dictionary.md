# Data Dictionary

## Conventions

The application stores timestamps as Unix epoch seconds in UTC. Identifiers are UUID strings unless noted otherwise. `NULL` means the value is not known or does not yet apply. User passwords and service credentials are not stored in this database; mock passwords remain in `auth.js`, and Azure/SQL credentials are supplied through environment variables.

The schema is managed by Knex migrations in `db/migrations`. Application writes go through the repositories in `db/repositories.js`; the repository layer is the contract for preserving status and edit history.

## Tables

### `users`

One row per application user. Demo identities are seeded from `db/seed.js`. Users are deactivated, never deleted, so their quote and edit history stays intact. On startup, every user whose email is listed in the `MANAGER_EMAILS` environment variable (comma-separated, set in `.env`) is granted the `Manager` role automatically; this is the first-manager setup and each grant is logged in `user_audit`.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Stable user identifier. |
| `email` | string, unique | Yes | Sign-in email address. |
| `name` | string | Yes | Display name. |
| `role` | string | Yes | Primary role: `Rep`, `Qualifier`, `Manager`, `Quoter`, or `Reviser`. Additional roles live in `user_roles`. |
| `team` | string | Yes | Organizational team, currently `Quotes` or `MDM`. |
| `active` | boolean | Yes | Whether the user may sign in and receive work. Defaults to true. Deactivated users can't sign in, and their open quotes show on the Manager home dashboard as needing reassignment. |
| `last_sign_in_at` | integer (epoch seconds) | No | Most recent sign-in time in UTC; null until the user's first sign-in. |
| `can_approve` | boolean | Yes | The "Can approve" permission: whether a Reviser may approve quotes from the Approval queue. Managers can always approve by default, regardless of this flag. The person who revised a quote (`final_reviewer_id`) cannot also approve it. Defaults to false. |

### `user_roles`

One row per role held by a user. A user can hold more than one role (for example a Manager who is also a Reviser) and switches between them in the sidebar. Only Managers can change roles. The workspace must always have at least one active Manager, and a Manager can't remove their own Manager role; the repository layer blocks both changes. Approval is not a role: it is the `can_approve` permission on `users`.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `user_id` | string, foreign key to `users.id` | Yes | User holding the role. Composite primary key with `role`. |
| `role` | string | Yes | Role name: `Rep`, `Qualifier`, `Manager`, `Quoter`, or `Reviser`. |

### `user_audit`

Append-only audit log of user and role changes, shown as the change history on each user's detail panel on the Settings page. One row per change: who changed what, the old value, the new value, and when.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Audit entry identifier. |
| `user_id` | string, foreign key to `users.id` | Yes | User the change applies to. |
| `changed_by_id` | string, foreign key to `users.id` | No | Manager who made the change; null for system changes made by the `MANAGER_EMAILS` startup grant. |
| `field` | string | Yes | What changed: `created` (user added), `roles`, `status` (activated/deactivated), or `can_approve` (approval permission). |
| `old_value` | text | No | Value before the change; null for `created`. |
| `new_value` | text | No | Value after the change. |
| `changed_at` | integer (epoch seconds) | Yes | Change time in UTC. |

### `accounts`

Customer/account directory. Account records are created from recognized quote details when a valid `C` account number is available.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Stable account identifier. |
| `account_number` | string, unique | Yes | Customer account number, expected to begin with `C` followed by digits. |
| `account_name` | string | Yes | Customer's display name. |

### `quotes`

A quote workflow record. Status transitions are recorded separately in `quote_status_history`.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Internal quote identifier. |
| `quote_number` | string, unique | Yes | Human-readable quote reference. `Q-000001` for Quote type, `MDM-000001` for MDM type; each type has its own counter. |
| `quote_type` | string | Yes | `Quote` or `MDM`. Determines the number prefix and the owning team. Defaults to `Quote`. |
| `account_id` | string, foreign key to `accounts.id` | No | Customer account for the quote. Set to null if an account is removed. |
| `submitted_by_rep` | string, foreign key to `users.id` | Yes | User who created/submitted the quote. |
| `team` | string | Yes | Team responsible for the quote (`Quotes` or `MDM`). |
| `template` | string | Yes | Extraction template key: `invoice`, `receipt`, `image`, or `full`. |
| `status` | string | Yes | Current workflow status: Submitted, Qualifying, Needs info, Ready to assign, Assigned, In progress, In revision, Awaiting approval, Approved, Sent to customer, Declined, Returned to quoter, or Returned to reviser. |
| `assigned_quoter_id` | string, foreign key to `users.id` | No | Quoter currently assigned. Set to null if that user is removed. |
| `screened_by_id` | string, foreign key to `users.id` | No | Reviser who screened the quote. |
| `final_reviewer_id` | string, foreign key to `users.id` | No | Reviser who made the final decision. Must differ from `screened_by_id` for a final review. |
| `contract_pricing` | boolean | Yes | Whether contract pricing was detected or confirmed. Defaults to false. |
| `created_at` | integer (epoch seconds) | Yes | Quote creation time in UTC. |
| `updated_at` | integer (epoch seconds) | Yes | Time of the most recent quote/status update in UTC. |

### `quote_files`

Source invoices, receipts, or images attached to a quote. File bytes are stored on disk under `uploads/quotes/`; this table holds the metadata and the `storage_key` pointer.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Internal source-file identifier. |
| `quote_id` | string, foreign key to `quotes.id` | Yes | Quote that owns this source file. Deleting the quote cascades to its files. |
| `file_name` | string | Yes | Sanitized original filename. |
| `file_type` | string | Yes | Uploaded MIME type, such as `application/pdf` or `image/png`. |
| `file_hash` | string | Yes | SHA-256 hash of the uploaded bytes; combined with account number for duplicate detection. |
| `uploaded_by_id` | string, foreign key to `users.id` | Yes | User who uploaded the file. |
| `uploaded_at` | integer (epoch seconds) | Yes | Upload time in UTC. |
| `invoice_source` | string | No | Competitor/vendor name recognized from the source. |
| `invoice_date` | date | No | Invoice date recognized from the source. |
| `storage_key` | string | No | Path to the stored bytes relative to the application root, such as `uploads/quotes/<id>-<file name>`. |

### `line_items`

Structured, editable quote line items extracted from a source file.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Internal line-item identifier. |
| `file_id` | string, foreign key to `quote_files.id` | Yes | Source file for this line. File deletion cascades to its line items. |
| `line_number` | integer | Yes | One-based line number within the source file. Unique with `file_id`. |
| `competitor_item_no` | string | No | Competitor/vendor item number. |
| `manufacturer_part_no` | string | No | Manufacturer part number. |
| `brand` | string | No | Product brand. |
| `description_raw` | text | No | Exact source description recognized by OCR. |
| `description_summary` | text | No | Short plain-English summary prepared for review. |
| `uom` | string | No | Source unit of measure, such as each, pair, dozen, or case. |
| `count_per_unit` | decimal | No | Number of individual items in one UOM. |
| `price_per_uom` | decimal | No | Price for one source UOM. |
| `quantity` | decimal | No | Number of source UOMs purchased. |
| `extended_price` | decimal | No | Total line price. |
| `normalized_unit_price` | decimal | No | `price_per_uom / count_per_unit`, or price per individual item. |
| `source_page` | string | No | Source page and nearest recognized line reference. |
| `confidence_min` | decimal | Yes | Lowest field confidence for this line, from 0 to 1. Defaults to 0. |
| `needs_review` | boolean | Yes | Whether any unreviewed line field needs attention. |
| `edited_by_quoter` | boolean | Yes | Whether a Quoter changed a field on this line. |

### `quote_status_history`

Append-only status transition history. Every application status transition inserts one row in the same transaction as the quote update. File management changes insert rows with `to_status` of `File added`, `File replaced`, or `File removed` and a null `from_status`.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Transition identifier. |
| `quote_id` | string, foreign key to `quotes.id` | Yes | Quote whose status changed. Quote deletion cascades to its history. |
| `from_status` | string | No | Status before the transition; null for quote creation. |
| `to_status` | string | Yes | Status after the transition. |
| `changed_by_id` | string, foreign key to `users.id` | No | User who made the transition; null if that user is later removed. |
| `changed_at` | integer (epoch seconds) | Yes | Transition time in UTC. |
| `reason` | text | No | Human-readable explanation for the transition. |

### `quote_extracted_fields`

One OCR baseline/current-value record per extracted header, detail, or line-item field. This table is required to calculate edit rates, including fields that were never edited.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Extracted-field record identifier. |
| `quote_file_id` | string, foreign key to `quote_files.id` | Yes | Source file from which the value was extracted. File deletion cascades to the record. |
| `line_item_id` | string, foreign key to `line_items.id` | No | Associated line item; null for header/detail fields. |
| `field_group` | string | Yes | `header`, `line`, or `detail`. |
| `field_name` | string | Yes | Stable field key from `fields.js`. |
| `template` | string | Yes | Template active at extraction time. |
| `original_value` | text | No | First value returned by OCR/normalization. This does not change after a Quoter edit. |
| `current_value` | text | No | Latest saved value after human corrections. |
| `confidence` | decimal | Yes | OCR/derived confidence from 0 to 1. |
| `needs_review` | boolean | Yes | Whether the value currently needs review. |
| `extracted_at` | integer (epoch seconds) | Yes | Extraction time in UTC. |

### `field_edits`

Append-only audit records for each changed extracted field. Header and detail edits have a null `line_item_id`; line edits reference the line item.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Field-edit identifier. |
| `line_item_id` | string, foreign key to `line_items.id` | No | Related line item; null for header/detail fields. |
| `quote_file_id` | string, foreign key to `quote_files.id` | Yes | Source file containing the edited extraction. |
| `extracted_field_id` | string, foreign key to `quote_extracted_fields.id` | Yes | OCR baseline/current-value record that was edited. |
| `field_name` | string | Yes | Stable field key from `fields.js`. |
| `original_value` | text | No | Original OCR value, retained for accuracy measurement. |
| `new_value` | text | No | Value submitted by the Quoter. |
| `edited_by_id` | string, foreign key to `users.id` | Yes | Quoter who saved the correction. |
| `edited_at` | integer (epoch seconds) | Yes | Edit time in UTC. |

### `pricing_reports`

Uploaded pricing report files (Current Price Tool and Costing Tool exports) attached to a quote. The parsed rows are stored as JSON in `row_data` so pricing can be recomputed without re-uploading.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Report identifier. |
| `quote_id` | string, foreign key to `quotes.id` | Yes | Quote this report belongs to. |
| `report_type` | string | Yes | `account` (Account price report), `house` (House account price report), or `costing` (Costing report). |
| `file_name` | string | Yes | Original uploaded file name. |
| `uploaded_by_id` | string, foreign key to `users.id` | Yes | User who uploaded the report. |
| `uploaded_at` | integer (epoch seconds) | Yes | Upload time in UTC. |
| `row_data` | text (JSON) | No | Parsed report rows keyed by canonical column names. |

### `line_pricing`

Computed and Quoter-entered pricing for one line item. One row per line item.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Line-pricing identifier. |
| `line_item_id` | string, foreign key to `line_items.id` | Yes | Priced line item. Unique. |
| `account_price` | decimal | No | Account's current price from the Account price report. |
| `financial_cost` | decimal | No | Winning financial cost (lowest above zero across the cost rules). Null for cost-exempt prefixes. |
| `cost_source` | string | No | Which cost rule won: `costing-direct`, `account-cost`, `converted`, `house-cost`, `none`, or `exempt`. |
| `current_margin` | decimal | No | `(account_price - financial_cost) / account_price`. |
| `target_margin` | decimal | No | Target margin for the line; defaults from settings. |
| `price_at_target` | decimal | No | `ROUNDUP(financial_cost / (1 - target_margin), 2)`. |
| `deviation_needed` | string | No | `Yes` when cost < account cost and cost = house cost; otherwise `No`. |
| `ctlge_price` | decimal | No | CTLGE price from the Costing report. |
| `final_price` | decimal | No | Quoter-confirmed final sell price. Changes are logged to `field_edits`. |
| `unavailable` | boolean | Yes | Whether the Quoter marked the line unavailable. Defaults to false. |
| `comment` | text | No | Quoter line comment. |

### `quote_comments`

Comment thread on every quote. Reps see only comments marked `visible_to_rep`.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Comment identifier. |
| `quote_id` | string, foreign key to `quotes.id` | Yes | Quote the comment belongs to. |
| `author_id` | string, foreign key to `users.id` | Yes | Comment author. |
| `body` | text | Yes | Comment text. |
| `visible_to_rep` | boolean | Yes | Whether the submitting Rep can see this comment. Defaults to false. |
| `created_at` | integer (epoch seconds) | Yes | Comment time in UTC. |

### `notifications`

Per-user notifications for queue events, returns, coaching, and approvals.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Notification identifier. |
| `user_id` | string, foreign key to `users.id` | Yes | Recipient. |
| `quote_id` | string, foreign key to `quotes.id` | No | Related quote, when applicable. |
| `kind` | string | Yes | Notification kind: `queue`, `returned`, `coaching`, or `approved`. |
| `message` | text | Yes | Human-readable notification text. |
| `read` | boolean | Yes | Whether the user has read it. Defaults to false. |
| `created_at` | integer (epoch seconds) | Yes | Notification time in UTC. |

### `coaching_notes`

Coaching notes recorded by Revisers or Managers about a Quoter's work.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Coaching note identifier. |
| `quote_id` | string, foreign key to `quotes.id` | Yes | Related quote. |
| `line_item_id` | string, foreign key to `line_items.id` | No | Related line item, when the note is line-specific. |
| `quoter_id` | string, foreign key to `users.id` | Yes | Quoter the note is about. |
| `reviser_id` | string, foreign key to `users.id` | Yes | Reviser or Manager who wrote the note. |
| `category` | string | Yes | Coaching category. |
| `note` | text | Yes | Coaching text. |
| `created_at` | integer (epoch seconds) | Yes | Creation time in UTC. |
| `visibility` | string | Yes | `archived` (records only) or `shared` (visible to the Quoter). |
| `shared_at` | integer (epoch seconds) | No | When the note was shared. |
| `shared_by_id` | string, foreign key to `users.id` | No | Manager who shared the note. |

### `templates`

Export template definitions created in the Manager template builder. Templates are versioned and deactivated, never deleted.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Template identifier. |
| `name` | string | Yes | Template display name. |
| `active` | boolean | Yes | Whether the template is available in the Quoter template picker. |
| `created_by_id` | string, foreign key to `users.id` | Yes | Manager who created the template. |

### `template_versions`

One row per published version of a template. Existing quotes keep the version they used.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Version identifier. |
| `template_id` | string, foreign key to `templates.id` | Yes | Parent template. |
| `version` | integer | Yes | Version number, incrementing per template. |
| `file_name` | string | No | Source Excel file name, when uploaded. |
| `published_at` | integer (epoch seconds) | No | Publish time in UTC. |

### `template_columns`

One row per column in a template version, in Excel order.

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `id` | string, primary key | Yes | Column identifier. |
| `version_id` | string, foreign key to `template_versions.id` | Yes | Parent template version. |
| `position` | integer | Yes | Column order, starting at 1. |
| `header` | string | Yes | Header text copied exactly from the source Excel file. |
| `excel_column` | string | Yes | Excel column letter (A, B, C, …). |
| `source` | string | Yes | `ocr`, `priceReport`, `crossReference`, `quoter`, `calculated`, or `blank`. |
| `field_key` | string | No | Matched field key from `fields.js`. |
| `formula` | text | No | The template's own formula for calculated columns. |
| `internal_only` | boolean | Yes | Whether the column is hidden from the customer export. |

### `user_settings`

Per-user personal settings (notification preferences, default view, table column layout, default submitter role for Reps, default template for Quoters).

| Column | Type | Required | Definition |
| --- | --- | --- | --- |
| `user_id` | string, foreign key to `users.id` | Yes | User. Composite primary key with `key`. |
| `key` | string | Yes | Setting key. |
| `value` | text | Yes | Setting value. |

## Reporting Views

### `v_quote_cycle_times`

One row per quote. Columns: `quote_id`, `quote_number`, `status`, `screening_seconds`, `waiting_to_assign_seconds`, `quoting_seconds`, `final_review_seconds`, and `total_seconds`. Stage durations are calculated from each status-history timestamp to the next transition (or the quote's `updated_at` for the current stage). The total is `updated_at - created_at`. Statuses are assigned to stages as described in [metrics.md](metrics.md).

### `v_quoter_workload`

One row per active Quoter. Columns: `quoter_id`, `quoter_name`, `quoter_email`, `team`, and `open_quotes`. Open means assigned to that user and not in Approved, Denied, or Exported status.

### `v_reviser_outcomes`

One row per active Reviser. Columns: `reviser_id`, `reviser_name`, `reviser_email`, `team`, `decisions`, `approved_count`, `denied_count`, `changes_requested_count`, `approved_rate_percent`, `denied_rate_percent`, and `changes_requested_rate_percent`. Only terminal review outcomes with that user as `final_reviewer_id` are counted.

### `v_ocr_accuracy`

One row per template and field name. Columns: `template`, `field_name`, `extracted_field_count`, `edited_field_count`, `edited_percent`, and `unchanged_percent`. Empty OCR values are excluded from the denominator.
