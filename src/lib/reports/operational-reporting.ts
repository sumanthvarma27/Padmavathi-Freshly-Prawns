import 'server-only'

type QueryResult = { data: unknown[] | null }

type QueryLike = PromiseLike<QueryResult> & {
  eq: (column: string, value: string) => QueryLike
  gte: (column: string, value: string) => QueryLike
  lte: (column: string, value: string) => QueryLike
  order: (column: string, options?: { ascending?: boolean }) => QueryLike
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => QueryLike
  }
}

type ReportFilters = {
  lotId?: string
  startDate?: string
  endDate?: string
  status?: 'open' | 'closed' | 'all'
}

type LotRow = {
  lot_id: string
  stock_inward_id?: string | null
  entry_date: string
  shed_id: string
  company_id: string
  raw_weight_kg: number | null
  processed_weight_kg: number | null
  status: string
  closed_reason?: string | null
  closed_by?: string | null
  closed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type EntryRow = {
  entry_id: string
  lot_id: string | null
  entry_date?: string | null
  created_at?: string | null
  shed_id?: string | null
  company_id?: string | null
  batch_id?: string | null
  processing_type_id?: string | null
  count_range_id?: string | null
  processed_weight_kg?: number | null
  rate_per_kg_snapshot?: number | null
  amount_snapshot?: number | null
}

type MemberSplitRow = {
  entry_id: string | null
  member_id: string | null
  processed_weight_kg?: number | null
}

type CompanyRow = { company_id: string; name: string }
type ShedRow = { shed_id: string; name: string }
type BatchRow = {
  batch_id: string
  batch_code?: string | null
  batch_name?: string | null
  leader_name?: string | null
}
type BatchMemberRow = {
  member_id: string
  member_name?: string | null
  batch_id?: string | null
}
type ProcessingTypeRow = {
  processing_type_id: string
  name: string
  sort_order?: number | null
}
type CountRangeRow = {
  count_range_id: string
  label: string
  min_count?: number | null
  max_count?: number | null
  sort_order?: number | null
}
type CompanyRateRow = {
  company_rate_id?: string
  company_id: string
  processing_type_id?: string | null
  count_range_id?: string | null
  rate_per_kg?: number | null
  effective_from: string
  effective_to?: string | null
  is_active?: boolean | null
}

export type ReportEntry = {
  entryId: string
  lotId: string
  entryDate: string
  createdAt: string
  companyId: string
  companyName: string
  shedId: string
  shedName: string
  batchId: string
  batchLabel: string
  leaderName: string
  processingTypeId: string
  processingTypeName: string
  countRangeId: string
  countRangeLabel: string
  processedWeightKg: number
  workerRatePerKg: number
  workerPayout: number
  companyRatePerKg: number | null
  companyPayout: number | null
  companyRateFound: boolean
  createdTimeLabel: string
}

export type MemberPayout = {
  memberId: string
  memberName: string
  batchId: string
  batchLabel: string
  processedWeightKg: number
  payoutAmount: number
}

export type LotFinancialReport = {
  lotId: string
  stockInwardId: string | null
  entryDate: string
  closedDate: string
  rawWeightKg: number
  processedWeightKg: number
  balanceWeightKg: number
  variationWeightKg: number
  yieldPercent: number
  workerPayoutTotal: number
  companyPayoutTotal: number
  netAmount: number
  avgWorkerRate: number
  avgCompanyRate: number
  processingEntriesCount: number
  workersCount: number
  status: string
  closedReason: string | null
  closedAt: string | null
  companyId: string
  companyName: string
  shedId: string
  shedName: string
  entries: ReportEntry[]
  memberPayouts: MemberPayout[]
  missingCompanyRates: string[]
}

export type DayClosureReport = {
  reportDate: string
  shedsActive: number
  companiesActive: number
  totalStockInwardKg: number
  totalProcessedKg: number
  totalVariationKg: number
  totalWorkerPayout: number
  totalCompanyPayout: number
  netAmount: number
  avgYieldPercent: number
  lotReports: LotFinancialReport[]
  entriesByShed: Array<{
    shedId: string
    shedName: string
    entries: ReportEntry[]
    totalProcessedKg: number
    totalWorkerPayout: number
    totalCompanyPayout: number
    avgYieldPercent: number
  }>
  companyTotals: Array<{
    companyId: string
    companyName: string
    rawWeightKg: number
    processedWeightKg: number
    workerPayout: number
    companyPayout: number
    netAmount: number
  }>
}

const PREFERRED_PROCESSING_TYPES = [
  'Peeled & Deveined',
  'Easy Peel',
  'Tail On',
  'Cooked Tail On',
  'Tail-On Full Cut',
  'PD Full Cut',
  'Tail-On Shaving',
]

function round2(value: number) {
  return Number(value.toFixed(2))
}

function toYmd(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function toTimeLabel(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().slice(11, 16)
}

function compareCountRanges(a: CountRangeRow, b: CountRangeRow) {
  const aMin = Number(a.min_count ?? Number.MAX_SAFE_INTEGER)
  const bMin = Number(b.min_count ?? Number.MAX_SAFE_INTEGER)
  if (aMin != bMin) return aMin - bMin
  const aMax = Number(a.max_count ?? Number.MAX_SAFE_INTEGER)
  const bMax = Number(b.max_count ?? Number.MAX_SAFE_INTEGER)
  if (aMax != bMax) return aMax - bMax
  return a.label.localeCompare(b.label)
}

function compareProcessingTypes(a: ProcessingTypeRow, b: ProcessingTypeRow) {
  const aPreferred = PREFERRED_PROCESSING_TYPES.indexOf(a.name)
  const bPreferred = PREFERRED_PROCESSING_TYPES.indexOf(b.name)
  if (aPreferred !== -1 || bPreferred !== -1) {
    if (aPreferred === -1) return 1
    if (bPreferred === -1) return -1
    return aPreferred - bPreferred
  }
  const aSort = Number(a.sort_order ?? Number.MAX_SAFE_INTEGER)
  const bSort = Number(b.sort_order ?? Number.MAX_SAFE_INTEGER)
  if (aSort !== bSort) return aSort - bSort
  return a.name.localeCompare(b.name)
}

function getRateWindowMatch(rate: CompanyRateRow, targetDate: string) {
  const target = new Date(`${targetDate}T00:00:00Z`)
  const from = new Date(rate.effective_from)
  const to = rate.effective_to ? new Date(rate.effective_to) : null
  if (Number.isNaN(target.getTime()) || Number.isNaN(from.getTime())) return false
  if (target.getTime() < from.getTime()) return false
  return to ? target.getTime() < to.getTime() : true
}

function getApplicableCompanyRate(
  rates: CompanyRateRow[],
  companyId: string,
  processingTypeId: string,
  countRangeId: string,
  targetDate: string
) {
  return rates.find((row) => {
    if (row.company_id !== companyId) return false
    if (row.processing_type_id !== processingTypeId) return false
    if (row.count_range_id !== countRangeId) return false
    return getRateWindowMatch(row, targetDate)
  }) || null
}

async function fetchRows(supabase: SupabaseLike, filters: ReportFilters) {
  const status = filters.status || 'all'

  let lotsQuery = supabase
    .from('processing_lots')
    .select('lot_id,stock_inward_id,entry_date,shed_id,company_id,raw_weight_kg,processed_weight_kg,status,closed_reason,closed_by,closed_at,created_at,updated_at')

  if (filters.lotId) lotsQuery = lotsQuery.eq('lot_id', filters.lotId)
  if (status !== 'all') lotsQuery = lotsQuery.eq('status', status)
  if (filters.startDate) lotsQuery = lotsQuery.gte('entry_date', filters.startDate)
  if (filters.endDate) lotsQuery = lotsQuery.lte('entry_date', filters.endDate)

  const [
    lotsRes,
    entriesRes,
    membersRes,
    companiesRes,
    shedsRes,
    batchesRes,
    batchMembersRes,
    processingTypesRes,
    countRangesRes,
    companyRatesRes,
  ] = await Promise.all([
    lotsQuery.order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
    supabase
      .from('processing_entries')
      .select('entry_id,lot_id,entry_date,created_at,shed_id,company_id,batch_id,processing_type_id,count_range_id,processed_weight_kg,rate_per_kg_snapshot,amount_snapshot')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('processing_entry_members')
      .select('entry_id,member_id,processed_weight_kg'),
    supabase.from('companies').select('company_id,name').order('name'),
    supabase.from('sheds').select('shed_id,name').order('name'),
    supabase.from('batches').select('batch_id,batch_code,batch_name,leader_name').order('batch_code'),
    supabase.from('batch_members').select('member_id,member_name,batch_id').order('member_name'),
    supabase.from('processing_types').select('processing_type_id,name,sort_order'),
    supabase.from('count_ranges').select('count_range_id,label,min_count,max_count,sort_order'),
    supabase
      .from('company_rates')
      .select('company_rate_id,company_id,processing_type_id,count_range_id,rate_per_kg,effective_from,effective_to,is_active')
      .order('effective_from', { ascending: false }),
  ])

  const lots = (lotsRes.data || []) as LotRow[]
  const lotIds = new Set(lots.map((lot) => lot.lot_id))

  return {
    lots,
    entries: ((entriesRes.data || []) as EntryRow[]).filter((entry) => entry.lot_id && lotIds.has(entry.lot_id)),
    memberSplits: (membersRes.data || []) as MemberSplitRow[],
    companies: (companiesRes.data || []) as CompanyRow[],
    sheds: (shedsRes.data || []) as ShedRow[],
    batches: (batchesRes.data || []) as BatchRow[],
    batchMembers: (batchMembersRes.data || []) as BatchMemberRow[],
    processingTypes: ((processingTypesRes.data || []) as ProcessingTypeRow[]).sort(compareProcessingTypes),
    countRanges: ((countRangesRes.data || []) as CountRangeRow[]).sort(compareCountRanges),
    companyRates: (companyRatesRes.data || []) as CompanyRateRow[],
  }
}

export async function getOperationalReports(supabase: SupabaseLike, filters: ReportFilters = {}) {
  const rows = await fetchRows(supabase, filters)

  const companyNameById = new Map(rows.companies.map((row) => [row.company_id, row.name]))
  const shedNameById = new Map(rows.sheds.map((row) => [row.shed_id, row.name]))
  const batchById = new Map(rows.batches.map((row) => [row.batch_id, row]))
  const batchMemberById = new Map(rows.batchMembers.map((row) => [row.member_id, row]))
  const processingTypeById = new Map(rows.processingTypes.map((row) => [row.processing_type_id, row]))
  const countRangeById = new Map(rows.countRanges.map((row) => [row.count_range_id, row]))

  const memberSplitsByEntry = new Map<string, MemberSplitRow[]>()
  rows.memberSplits.forEach((row) => {
    if (!row.entry_id) return
    const list = memberSplitsByEntry.get(row.entry_id) || []
    list.push(row)
    memberSplitsByEntry.set(row.entry_id, list)
  })

  const entriesByLot = new Map<string, EntryRow[]>()
  rows.entries.forEach((row) => {
    if (!row.lot_id) return
    const list = entriesByLot.get(row.lot_id) || []
    list.push(row)
    entriesByLot.set(row.lot_id, list)
  })

  const lotReports: LotFinancialReport[] = rows.lots.map((lot) => {
    const lotEntries = (entriesByLot.get(lot.lot_id) || []).slice().sort((a, b) => {
      const aTime = new Date(a.created_at || a.entry_date || '').getTime()
      const bTime = new Date(b.created_at || b.entry_date || '').getTime()
      return aTime - bTime
    })

    const memberPayoutMap = new Map<string, MemberPayout>()
    const missingCompanyRates = new Set<string>()

    const entries: ReportEntry[] = lotEntries.map((entry) => {
      const processedWeightKg = Number(entry.processed_weight_kg || 0)
      const workerRatePerKg = Number(entry.rate_per_kg_snapshot || 0)
      const workerPayout = round2(Number(entry.amount_snapshot || processedWeightKg * workerRatePerKg))
      const companyRateRow = getApplicableCompanyRate(
        rows.companyRates,
        lot.company_id,
        entry.processing_type_id || '',
        entry.count_range_id || '',
        toYmd(entry.entry_date || lot.entry_date)
      )
      const companyRatePerKg = companyRateRow ? Number(companyRateRow.rate_per_kg || 0) : null
      const companyPayout = companyRatePerKg == null ? null : round2(processedWeightKg * companyRatePerKg)

      const processingTypeName = processingTypeById.get(entry.processing_type_id || '')?.name || 'Unknown Type'
      const countRangeLabel = countRangeById.get(entry.count_range_id || '')?.label || 'Unknown Count'
      const batch = batchById.get(entry.batch_id || '')
      const batchLabel = batch?.batch_code || batch?.batch_name || 'Unknown Batch'
      const leaderName = batch?.leader_name || '-'

      if (companyRatePerKg == null) {
        missingCompanyRates.add(`${processingTypeName} / ${countRangeLabel}`)
      }

      const splits = memberSplitsByEntry.get(entry.entry_id) || []
      splits.forEach((split) => {
        if (!split.member_id) return
        const batchMember = batchMemberById.get(split.member_id)
        const key = split.member_id
        const current = memberPayoutMap.get(key) || {
          memberId: split.member_id,
          memberName: batchMember?.member_name || 'Unknown Member',
          batchId: batchMember?.batch_id || entry.batch_id || '',
          batchLabel,
          processedWeightKg: 0,
          payoutAmount: 0,
        }
        const memberWeight = Number(split.processed_weight_kg || 0)
        current.processedWeightKg = round2(current.processedWeightKg + memberWeight)
        current.payoutAmount = round2(current.payoutAmount + memberWeight * workerRatePerKg)
        memberPayoutMap.set(key, current)
      })

      return {
        entryId: entry.entry_id,
        lotId: lot.lot_id,
        entryDate: toYmd(entry.entry_date || lot.entry_date),
        createdAt: entry.created_at || '',
        companyId: lot.company_id,
        companyName: companyNameById.get(lot.company_id) || lot.company_id,
        shedId: lot.shed_id,
        shedName: shedNameById.get(lot.shed_id) || lot.shed_id,
        batchId: entry.batch_id || '',
        batchLabel,
        leaderName,
        processingTypeId: entry.processing_type_id || '',
        processingTypeName,
        countRangeId: entry.count_range_id || '',
        countRangeLabel,
        processedWeightKg,
        workerRatePerKg,
        workerPayout,
        companyRatePerKg,
        companyPayout,
        companyRateFound: companyRatePerKg != null,
        createdTimeLabel: toTimeLabel(entry.created_at),
      }
    })

    const rawWeightKg = Number(lot.raw_weight_kg || 0)
    const processedWeightKg = Number(lot.processed_weight_kg || 0)
    const balanceWeightKg = round2(rawWeightKg - processedWeightKg)
    const variationWeightKg = round2(Math.max(0, rawWeightKg - processedWeightKg))
    const workerPayoutTotal = round2(entries.reduce((sum, entry) => sum + entry.workerPayout, 0))
    const companyPayoutTotal = round2(entries.reduce((sum, entry) => sum + Number(entry.companyPayout || 0), 0))
    const yieldPercent = rawWeightKg > 0 ? round2((processedWeightKg / rawWeightKg) * 100) : 0
    const avgWorkerRate = processedWeightKg > 0 ? round2(workerPayoutTotal / processedWeightKg) : 0
    const avgCompanyRate = processedWeightKg > 0 ? round2(companyPayoutTotal / processedWeightKg) : 0
    const memberPayouts = Array.from(memberPayoutMap.values()).sort((a, b) => {
      if (b.payoutAmount !== a.payoutAmount) return b.payoutAmount - a.payoutAmount
      return a.memberName.localeCompare(b.memberName)
    })

    return {
      lotId: lot.lot_id,
      stockInwardId: lot.stock_inward_id || null,
      entryDate: toYmd(lot.entry_date),
      closedDate: toYmd(lot.closed_at || lot.entry_date),
      rawWeightKg,
      processedWeightKg,
      balanceWeightKg,
      variationWeightKg,
      yieldPercent,
      workerPayoutTotal,
      companyPayoutTotal,
      netAmount: round2(companyPayoutTotal - workerPayoutTotal),
      avgWorkerRate,
      avgCompanyRate,
      processingEntriesCount: entries.length,
      workersCount: memberPayouts.length,
      status: lot.status,
      closedReason: lot.closed_reason || null,
      closedAt: lot.closed_at || null,
      companyId: lot.company_id,
      companyName: companyNameById.get(lot.company_id) || lot.company_id,
      shedId: lot.shed_id,
      shedName: shedNameById.get(lot.shed_id) || lot.shed_id,
      entries,
      memberPayouts,
      missingCompanyRates: Array.from(missingCompanyRates.values()).sort(),
    }
  })

  const closedLotReports = lotReports.filter((lot) => lot.status === 'closed')

  const dayReportsMap = new Map<string, DayClosureReport>()
  closedLotReports.forEach((lot) => {
    const key = lot.closedDate || lot.entryDate
    const current = dayReportsMap.get(key) || {
      reportDate: key,
      shedsActive: 0,
      companiesActive: 0,
      totalStockInwardKg: 0,
      totalProcessedKg: 0,
      totalVariationKg: 0,
      totalWorkerPayout: 0,
      totalCompanyPayout: 0,
      netAmount: 0,
      avgYieldPercent: 0,
      lotReports: [],
      entriesByShed: [],
      companyTotals: [],
    }
    current.lotReports.push(lot)
    current.totalStockInwardKg = round2(current.totalStockInwardKg + lot.rawWeightKg)
    current.totalProcessedKg = round2(current.totalProcessedKg + lot.processedWeightKg)
    current.totalVariationKg = round2(current.totalVariationKg + lot.variationWeightKg)
    current.totalWorkerPayout = round2(current.totalWorkerPayout + lot.workerPayoutTotal)
    current.totalCompanyPayout = round2(current.totalCompanyPayout + lot.companyPayoutTotal)
    current.netAmount = round2(current.totalCompanyPayout - current.totalWorkerPayout)
    dayReportsMap.set(key, current)
  })

  const dayReports = Array.from(dayReportsMap.values())
    .map((report) => {
      const shedMap = new Map<string, DayClosureReport['entriesByShed'][number]>()
      const companyMap = new Map<string, DayClosureReport['companyTotals'][number]>()
      const uniqueSheds = new Set<string>()
      const uniqueCompanies = new Set<string>()

      report.lotReports.forEach((lot) => {
        uniqueSheds.add(lot.shedId)
        uniqueCompanies.add(lot.companyId)

        const companyCurrent = companyMap.get(lot.companyId) || {
          companyId: lot.companyId,
          companyName: lot.companyName,
          rawWeightKg: 0,
          processedWeightKg: 0,
          workerPayout: 0,
          companyPayout: 0,
          netAmount: 0,
        }
        companyCurrent.rawWeightKg = round2(companyCurrent.rawWeightKg + lot.rawWeightKg)
        companyCurrent.processedWeightKg = round2(companyCurrent.processedWeightKg + lot.processedWeightKg)
        companyCurrent.workerPayout = round2(companyCurrent.workerPayout + lot.workerPayoutTotal)
        companyCurrent.companyPayout = round2(companyCurrent.companyPayout + lot.companyPayoutTotal)
        companyCurrent.netAmount = round2(companyCurrent.companyPayout - companyCurrent.workerPayout)
        companyMap.set(lot.companyId, companyCurrent)

        const shedCurrent = shedMap.get(lot.shedId) || {
          shedId: lot.shedId,
          shedName: lot.shedName,
          entries: [],
          totalProcessedKg: 0,
          totalWorkerPayout: 0,
          totalCompanyPayout: 0,
          avgYieldPercent: 0,
        }
        shedCurrent.entries.push(...lot.entries)
        shedCurrent.totalProcessedKg = round2(shedCurrent.totalProcessedKg + lot.processedWeightKg)
        shedCurrent.totalWorkerPayout = round2(shedCurrent.totalWorkerPayout + lot.workerPayoutTotal)
        shedCurrent.totalCompanyPayout = round2(shedCurrent.totalCompanyPayout + lot.companyPayoutTotal)
        shedMap.set(lot.shedId, shedCurrent)
      })

      const entriesByShed = Array.from(shedMap.values())
        .map((shed) => {
          const relatedLots = report.lotReports.filter((lot) => lot.shedId === shed.shedId)
          const rawTotal = relatedLots.reduce((sum, lot) => sum + lot.rawWeightKg, 0)
          const processedTotal = relatedLots.reduce((sum, lot) => sum + lot.processedWeightKg, 0)
          return {
            ...shed,
            entries: shed.entries.slice().sort((a, b) => {
              const typeCompare = compareProcessingTypes(
                processingTypeById.get(a.processingTypeId) || { processing_type_id: '', name: a.processingTypeName },
                processingTypeById.get(b.processingTypeId) || { processing_type_id: '', name: b.processingTypeName }
              )
              if (typeCompare !== 0) return typeCompare
              const rangeA = countRangeById.get(a.countRangeId) || { count_range_id: '', label: a.countRangeLabel }
              const rangeB = countRangeById.get(b.countRangeId) || { count_range_id: '', label: b.countRangeLabel }
              return compareCountRanges(rangeA, rangeB)
            }),
            avgYieldPercent: rawTotal > 0 ? round2((processedTotal / rawTotal) * 100) : 0,
          }
        })
        .sort((a, b) => a.shedName.localeCompare(b.shedName))

      const companyTotals = Array.from(companyMap.values()).sort((a, b) => a.companyName.localeCompare(b.companyName))
      const avgYieldPercent = report.totalStockInwardKg > 0
        ? round2((report.totalProcessedKg / report.totalStockInwardKg) * 100)
        : 0

      return {
        ...report,
        shedsActive: uniqueSheds.size,
        companiesActive: uniqueCompanies.size,
        avgYieldPercent,
        entriesByShed,
        companyTotals,
      }
    })
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))

  return {
    lotReports,
    closedLotReports,
    dayReports,
    processingTypes: rows.processingTypes,
    countRanges: rows.countRanges,
  }
}

export async function getLotFinancialReport(supabase: SupabaseLike, lotId: string) {
  const { lotReports } = await getOperationalReports(supabase, { lotId, status: 'all' })
  return lotReports[0] || null
}
