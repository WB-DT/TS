const assert = require("node:assert/strict");
const test = require("node:test");
const { loadFormRows } = require("../quote-stages");

const details = {
  contractNumber: "PPL123",
  description: "Holiday supplies",
  startDate: "2026-11-10",
  endDate: "2027-11-09",
  contractType: "Type A",
  classification: "Class B",
  contractOwner: "Jane Quoter",
};

const line = (overrides = {}) => ({
  our_item: "ab123",
  our_uom: "cs",
  sell_price: 12.5,
  autoTags: [],
  tags: [],
  line_status: null,
  ...overrides,
});

test("each load form row has 18 columns in the color key layout", () => {
  const [row] = loadFormRows({ lines: [line()] }, details);
  assert.equal(row.length, 18);
  assert.deepEqual(row, [
    "PPL123", "Holiday supplies", "", "11/10/2026", "11/9/2027", "Type A", "Class B",
    "AB123", "CS", "", "12.5", "", "", "", "", "", "", "Jane Quoter",
  ]);
});

test("blank columns C, J and L to Q stay empty", () => {
  const [row] = loadFormRows({ lines: [line()] }, details);
  for (const index of [2, 9, 11, 12, 13, 14, 15, 16]) {
    assert.equal(row[index], "", `column index ${index} should be blank`);
  }
});

test("contract owner is written to column R", () => {
  const [row] = loadFormRows({ lines: [line()] }, details);
  assert.equal(row[17], "Jane Quoter");
});

test("Pack Ship, unpriced and duplicate lines are left out", () => {
  const rows = loadFormRows({
    lines: [
      line(),
      line({ our_item: "zz9", autoTags: ["Pack Ship"] }),
      line({ our_item: "yy8", sell_price: null }),
      line({ our_item: "AB123", our_uom: "CS" }),
    ],
  }, details);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][7], "AB123");
});
