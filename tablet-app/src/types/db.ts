export type Option = {
  id: string
  label: string
}

export type BatchOption = Option & {
  batchCode: string
}

export type BatchMemberOption = Option & {
  batchId: string
}

export type MasterData = {
  companies: Option[]
  sheds: Option[]
  batches: BatchOption[]
  batchMembers: BatchMemberOption[]
  processingTypes: Option[]
  countRanges: Option[]
}
