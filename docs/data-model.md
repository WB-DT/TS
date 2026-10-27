# ACT CRM Stage 1 Data Model

## Status

Draft

## Purpose

This document defines how ACT CRM Stage 1 understands and displays account-management information.

The application will read approved information from the existing data source. This project will not modify existing Dataverse tables or Power Queries during the reconstruction phase.

## Governing rules

- Existing Dataverse tables remain unchanged.
- Existing Power Queries remain unchanged.
- The application retrieves and displays approved information where applicable.
- Dataverse field names are mapped to understandable application property names.
- Mapping a field does not rename or modify the Dataverse column.
- The application must not invent unavailable values.
- Missing information must display an approved empty or unavailable state.
- CRM records must not be stored in browser localStorage.
- User access must be enforced by the approved data service.
- The browser interface must not be treated as the authorization boundary.
- User-entered and retrieved values must be rendered as plain text unless approved sanitization is provided.

## Existing read-only source

Environment:

```text
org23279050.crm.dynamics.com
