export type StockInwardContext = {
  id: string
  stockInwardId?: string
  entryDate: string
  shedId: string
  shedLabel: string
  companyId: string
  companyLabel: string
  rawWeightKg: number
  processedWeightKg: number
  status: 'open' | 'closed'
  closedAt?: string
}
