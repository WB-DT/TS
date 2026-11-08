# Navigation spec delta

## ADDED Requirements

### Requirement: Request log is labelled Quote log

The request log page SHALL be labelled "Quote log" in the menu and page title for the Qualifier and Manager roles. Its address SHALL stay the same.

#### Scenario: Manager opens the menu

- **WHEN** a Manager views the menu
- **THEN** a "Quote log" item appears
- **AND** no "Request log" item appears

## REMOVED Requirements

### Requirement: Role menus list the removed items

The menus SHALL NOT list New request (intake), Import from Teams, Read a document, Cross-reference, Coaching, or the old Quote log item.

#### Scenario: Manager menu

- **WHEN** a Manager views the menu
- **THEN** the menu shows Dashboard, Quote log, Assignments, Approval queue, Reports, Templates and Settings

#### Scenario: Qualifier menu

- **WHEN** a Qualifier views the menu
- **THEN** the menu shows Dashboard, Screening queue and Quote log

#### Scenario: Quoter menu

- **WHEN** a Quoter views the menu
- **THEN** the menu shows Dashboard, My quotes and Quote workspace

#### Scenario: Margin Manager menu

- **WHEN** a Margin Manager views the menu
- **THEN** the menu shows Locked prices

### Requirement: Quote log page has no import

The quote log page SHALL NOT offer an import of Dataverse exports, and the request log import route SHALL NOT be served.

#### Scenario: Import route requested

- **WHEN** a client posts to `/api/request-log/import`
- **THEN** the server responds with "not found"

### Requirement: Removed pages are not served

The pages for New request, Import from Teams, Read a document, Cross-reference and Coaching SHALL NOT be served.

#### Scenario: Old address requested

- **WHEN** a user opens `/manager/cross-reference`
- **THEN** the page is not found
