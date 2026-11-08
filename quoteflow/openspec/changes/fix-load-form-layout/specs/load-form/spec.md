# Load Form spec delta

## ADDED Requirements

### Requirement: Load Form has the key's 18-column layout

The Load Form export SHALL write one CSV row per priced line, with 18 columns in the order of the Load Form tab of the color key. Columns C, J and L to Q SHALL be empty.

#### Scenario: One priced line

- **WHEN** the quote has one priced line with item "ab123", UOM "cs", and sell price 12.5
- **THEN** the row has 18 columns
- **AND** column H is "AB123", column I is "CS", and column K is "12.5"
- **AND** columns C, J, L, M, N, O, P and Q are empty

#### Scenario: Blank columns are never filled with defaults

- **WHEN** the row is written
- **THEN** no column contains "1", "0" or "N" unless that value comes from a questionnaire answer or an approved line

### Requirement: Contract owner is required

The Load Form export SHALL require the contract owner answer, written to column R. It SHALL NOT substitute a placeholder value.

#### Scenario: Contract owner missing

- **WHEN** the quoter submits the Load Form without a contract owner
- **THEN** the export responds with HTTP 400
- **AND** the message asks the quoter to fill in the contract owner

#### Scenario: Contract owner given

- **WHEN** the quoter enters "Jane Quoter" as the contract owner
- **THEN** column R of every row is "Jane Quoter"

### Requirement: Load Form questionnaire asks only the seven answers

The Load Form modal SHALL ask for contract number, description, start date, end date, contract type, classification and contract owner. The contract owner input SHALL start empty and be marked required.

#### Scenario: Opening the modal

- **WHEN** the quoter opens the Load Form questions
- **THEN** the contract owner field is empty
- **AND** the field is marked required
- **AND** blank columns from the key are not shown
