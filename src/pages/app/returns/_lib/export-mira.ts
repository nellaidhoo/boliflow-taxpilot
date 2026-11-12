import type { Worksheet } from "exceljs";
import type { ReturnData } from "@/convex/lib/returnBuilder.ts";
import { GST_RATES, MIRA_INPUT_RATE_COLUMNS } from "@/convex/lib/taxRules.ts";

type ExportInput = ReturnData & {
  business: { name: string; tin: string };
  periodLabel: string;
  startDate: string;
  endDate: string;
};

const MONEY = "#,##0.00";

/**
 * Builds the MIRA 205 workbook in the browser: the return summary plus the
 * Input and Output Tax Statements laid out like MIRA's v25.1 templates.
 */
export async function downloadMira205(input: ExportInput) {
  // Loaded on demand so the spreadsheet library doesn't slow down every page
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "TaxPilot by BoliFlow";
  wb.created = new Date();
  // GST registration number doubles as the taxable activity number (e.g. ...GST501)
  const activity = input.business.tin;

  // ---- Summary ----
  const summary = wb.addWorksheet("MIRA205 Summary");
  summary.columns = [{ width: 46 }, { width: 20 }, { width: 20 }];
  summary.addRow(["MIRA 205 GST Return (prepared by TaxPilot)"]).font = { bold: true, size: 14 };
  summary.addRow(["Taxpayer", input.business.name]);
  summary.addRow(["TIN", input.business.tin]);
  summary.addRow(["Taxable period", `${input.periodLabel} (${input.startDate} to ${input.endDate})`]);
  summary.addRow([]);
  summary.addRow(["Supplies", "Value excl. GST (MVR)", "GST (MVR)"]).font = { bold: true };
  for (const r of input.summary.standardRatedByRate) {
    summary.addRow([`Standard-rated supplies at ${r.rate}%`, r.value, r.gst]);
  }
  summary.addRow(["Zero-rated supplies", input.summary.zeroRated, 0]);
  summary.addRow(["Exempt supplies", input.summary.exempt, 0]);
  summary.addRow(["Total supplies", input.summary.totalSupplies, input.summary.outputTax]).font = { bold: true };
  summary.addRow([]);
  summary.addRow(["Output tax", "", input.summary.outputTax]);
  summary.addRow(["Less: input tax claimed", "", input.summary.inputTax]);
  const net = input.summary.netGst;
  summary.addRow([net >= 0 ? "GST payable" : "GST refundable / carried forward", "", Math.abs(net)]).font = {
    bold: true,
  };
  summary.getColumn(2).numFmt = MONEY;
  summary.getColumn(3).numFmt = MONEY;

  // ---- Input Tax Statement ----
  const inputSheet = wb.addWorksheet("InputTaxStatement");
  inputSheet.columns = [
    { header: "No.", width: 6 },
    { header: "Supplier TIN", width: 18 },
    { header: "Supplier Name", width: 32 },
    { header: "Supplier Invoice Number", width: 22 },
    { header: "Invoice Date", width: 14 },
    { header: "Invoice Total (excl. GST)", width: 20 },
    ...MIRA_INPUT_RATE_COLUMNS.map((r) => ({ header: `GST charged at ${r}%`, width: 16 })),
    { header: "Your Taxable Activity Number", width: 24 },
    { header: "Revenue / Capital", width: 16 },
  ];
  for (const row of input.inputRows) {
    inputSheet.addRow([
      row.serial,
      row.supplierTin,
      row.supplierName,
      row.invoiceNumber,
      row.invoiceDate,
      row.totalExclGst,
      ...MIRA_INPUT_RATE_COLUMNS.map((r) => row.gstByRate[r] ?? 0),
      activity,
      "Revenue",
    ]);
  }
  styleTable(inputSheet, 6, 6 + MIRA_INPUT_RATE_COLUMNS.length);

  // ---- Output Tax Statement: invoices to GST-registered customers ----
  const supplyHeaders = [
    ...GST_RATES.map((r) => ({ header: `Value subject to GST at ${r}% (excl. GST)`, width: 22 })),
    { header: "Zero-rated Supplies", width: 18 },
    { header: "Exempt Supplies", width: 18 },
    { header: "Out-of-scope Supplies", width: 18 },
    { header: "Your Taxable Activity Number", width: 24 },
  ];
  const taxInvoices = wb.addWorksheet("TaxInvoices");
  taxInvoices.columns = [
    { header: "Customer TIN", width: 18 },
    { header: "Customer Name", width: 32 },
    { header: "Invoice Number", width: 20 },
    { header: "Invoice Date", width: 14 },
    ...supplyHeaders,
  ];
  for (const row of input.taxInvoiceRows) {
    taxInvoices.addRow([
      row.customerTin,
      row.customerName,
      row.invoiceNumber,
      row.invoiceDate,
      ...GST_RATES.map((r) => row.valueByRate[r] ?? 0),
      row.zeroRated,
      row.exempt,
      row.outOfScope,
      activity,
    ]);
  }
  styleTable(taxInvoices, 5, 4 + GST_RATES.length + 3);

  // ---- Output Tax Statement: all other sales, totalled per taxable activity ----
  const other = wb.addWorksheet("OtherTransactions");
  other.columns = [{ header: "Your Taxable Activity Number", width: 24 }, ...supplyHeaders.slice(0, -1)];
  const o = input.otherTransactions;
  other.addRow([activity, ...GST_RATES.map((r) => o.valueByRate[r] ?? 0), o.zeroRated, o.exempt, o.outOfScope]);
  styleTable(other, 2, 1 + GST_RATES.length + 3);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MIRA205_${input.business.tin}_${input.startDate}_${input.endDate}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}


/** Bold header row and money format for columns firstMoney..lastMoney (1-based). */
function styleTable(sheet: Worksheet, firstMoney: number, lastMoney: number) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { wrapText: true, vertical: "middle" };
  for (let c = firstMoney; c <= lastMoney; c++) sheet.getColumn(c).numFmt = MONEY;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}
