import type { DayClosureReport, LotFinancialReport } from '@/lib/reports/operational-reporting'

export type ExportDefinition = {
  key: string
  title: string
  description: string
  headers: string[]
  rows: string[][]
  filenamePrefix: string
}

export function buildOperationalExportDefinitions({
  lotReports,
  closedLotReports,
  dayReports,
}: {
  lotReports: LotFinancialReport[]
  closedLotReports: LotFinancialReport[]
  dayReports: DayClosureReport[]
}): ExportDefinition[] {
  const allEntries = lotReports.flatMap((lot) => lot.entries)
  const allMembers = lotReports.flatMap((lot) => lot.memberPayouts)

  const payrollByBatch = new Map<
    string,
    { batch: string; leader: string; entries: number; weight: number; amount: number }
  >()
  allEntries.forEach((entry) => {
    const key = entry.batchId || entry.batchLabel
    const current = payrollByBatch.get(key) || {
      batch: entry.batchLabel,
      leader: entry.leaderName,
      entries: 0,
      weight: 0,
      amount: 0,
    }
    current.entries += 1
    current.weight += entry.processedWeightKg
    current.amount += entry.workerPayout
    payrollByBatch.set(key, current)
  })

  const payrollByMember = new Map<string, { member: string; batch: string; weight: number; payout: number }>()
  allMembers.forEach((member) => {
    const current = payrollByMember.get(member.memberId) || {
      member: member.memberName,
      batch: member.batchLabel,
      weight: 0,
      payout: 0,
    }
    current.weight += member.processedWeightKg
    current.payout += member.payoutAmount
    payrollByMember.set(member.memberId, current)
  })

  return [
    {
      key: 'stock-inward',
      title: 'Stock Inward Report',
      description: 'Lot-level stock inward summary with worker and company totals.',
      filenamePrefix: 'stock_inward_report',
      headers: ['Entry Date', 'Closed Date', 'Company', 'Shed', 'Lot', 'Raw (kg)', 'Processed (kg)', 'Variation (kg)', 'Yield %', 'Worker Payout', 'Company Payout', 'Net', 'Status'],
      rows: lotReports.map((lot) => [
        lot.entryDate,
        lot.closedDate,
        lot.companyName,
        lot.shedName,
        lot.lotId,
        lot.rawWeightKg.toFixed(2),
        lot.processedWeightKg.toFixed(2),
        lot.variationWeightKg.toFixed(2),
        lot.yieldPercent.toFixed(2),
        lot.workerPayoutTotal.toFixed(2),
        lot.companyPayoutTotal.toFixed(2),
        lot.netAmount.toFixed(2),
        lot.status,
      ]),
    },
    {
      key: 'processing-entries',
      title: 'Processing Entries Report',
      description: 'Processing rows with worker and company payout amounts.',
      filenamePrefix: 'processing_entries_report',
      headers: ['Entry Date', 'Company', 'Shed', 'Lot', 'Batch', 'Leader', 'Process Type', 'Count', 'Output (kg)', 'Worker Rate', 'Worker Payout', 'Company Rate', 'Company Payout', 'Time'],
      rows: allEntries.map((entry) => [
        entry.entryDate,
        entry.companyName,
        entry.shedName,
        entry.lotId,
        entry.batchLabel,
        entry.leaderName,
        entry.processingTypeName,
        entry.countRangeLabel,
        entry.processedWeightKg.toFixed(2),
        entry.workerRatePerKg.toFixed(2),
        entry.workerPayout.toFixed(2),
        entry.companyRatePerKg == null ? '-' : entry.companyRatePerKg.toFixed(2),
        entry.companyPayout == null ? '-' : entry.companyPayout.toFixed(2),
        entry.createdTimeLabel,
      ]),
    },
    {
      key: 'payroll-summary',
      title: 'Payroll By Batch Report',
      description: 'Batch-level worker payout summary.',
      filenamePrefix: 'payroll_by_batch',
      headers: ['Batch', 'Leader', 'Entries', 'Processed (kg)', 'Payout Amount'],
      rows: Array.from(payrollByBatch.values())
        .sort((a, b) => b.amount - a.amount)
        .map((row) => [row.batch, row.leader, String(row.entries), row.weight.toFixed(2), row.amount.toFixed(2)]),
    },
    {
      key: 'payroll-members',
      title: 'Payroll By Member Report',
      description: 'Member-level worker payout summary.',
      filenamePrefix: 'payroll_by_member',
      headers: ['Member', 'Batch', 'Processed (kg)', 'Payout Amount'],
      rows: Array.from(payrollByMember.values())
        .sort((a, b) => b.payout - a.payout)
        .map((row) => [row.member, row.batch, row.weight.toFixed(2), row.payout.toFixed(2)]),
    },
    {
      key: 'day-end',
      title: 'Day-End Report',
      description: 'Closed-day admin cross-check summary.',
      filenamePrefix: 'day_end_report',
      headers: ['Report Date', 'Sheds Active', 'Companies Active', 'Total Stock Inward (kg)', 'Total Processed (kg)', 'Variation (kg)', 'Worker Payout', 'Company Payout', 'Net', 'Avg Yield %'],
      rows: dayReports.map((day) => [
        day.reportDate,
        String(day.shedsActive),
        String(day.companiesActive),
        day.totalStockInwardKg.toFixed(2),
        day.totalProcessedKg.toFixed(2),
        day.totalVariationKg.toFixed(2),
        day.totalWorkerPayout.toFixed(2),
        day.totalCompanyPayout.toFixed(2),
        day.netAmount.toFixed(2),
        day.avgYieldPercent.toFixed(2),
      ]),
    },
    {
      key: 'closed-lots',
      title: 'Closed Lot Report',
      description: 'Individual closed lots with closure metrics.',
      filenamePrefix: 'closed_lot_report',
      headers: ['Lot', 'Entry Date', 'Closed Date', 'Company', 'Shed', 'Raw (kg)', 'Processed (kg)', 'Variation (kg)', 'Yield %', 'Worker Payout', 'Company Payout', 'Net', 'Workers', 'Entries', 'Reason'],
      rows: closedLotReports.map((lot) => [
        lot.lotId,
        lot.entryDate,
        lot.closedDate,
        lot.companyName,
        lot.shedName,
        lot.rawWeightKg.toFixed(2),
        lot.processedWeightKg.toFixed(2),
        lot.variationWeightKg.toFixed(2),
        lot.yieldPercent.toFixed(2),
        lot.workerPayoutTotal.toFixed(2),
        lot.companyPayoutTotal.toFixed(2),
        lot.netAmount.toFixed(2),
        String(lot.workersCount),
        String(lot.processingEntriesCount),
        lot.closedReason || '-',
      ]),
    },
    {
      key: 'company-cross-check',
      title: 'Company Cross Check Report',
      description: 'Company payout totals by closed day.',
      filenamePrefix: 'company_cross_check',
      headers: ['Report Date', 'Company', 'Raw (kg)', 'Processed (kg)', 'Worker Payout', 'Company Payout', 'Net'],
      rows: dayReports.flatMap((day) =>
        day.companyTotals.map((company) => [
          day.reportDate,
          company.companyName,
          company.rawWeightKg.toFixed(2),
          company.processedWeightKg.toFixed(2),
          company.workerPayout.toFixed(2),
          company.companyPayout.toFixed(2),
          company.netAmount.toFixed(2),
        ])
      ),
    },
  ]
}
