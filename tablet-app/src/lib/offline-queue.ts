import { submitStockInward, submitProcessingEntryAtomic } from './transactions'

type QueueItem =
  | {
      id: string
      type: 'stock_inward'
      payload: {
        entryDate: string
        shedId: string
        companyId: string
        rawWeightKg: number
      }
      createdAt: string
    }
  | {
      id: string
      type: 'processing_round'
      payload: {
        lotId: string
        batchId: string
        processingTypeId: string
        countRangeId: string
        ratePerKgSnapshot: number
        memberWeights: Array<{ memberId: string; weightKg: number }>
      }
      createdAt: string
    }

const STORAGE_KEY = 'padmavathi_offline_queue_v1'

type StorageLike = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
}

async function getStorage(): Promise<StorageLike | null> {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        window.localStorage.setItem(key, value)
      },
    }
  }

  try {
    const asyncStorageModule = await import('@react-native-async-storage/async-storage')
    const asyncStorage = asyncStorageModule.default
    return {
      getItem: (key: string) => asyncStorage.getItem(key),
      setItem: (key: string, value: string) => asyncStorage.setItem(key, value),
    }
  } catch {
    return null
  }
}

export async function getQueue(): Promise<QueueItem[]> {
  const storage = await getStorage()
  if (!storage) return []

  try {
    const raw = await storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueueItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function setQueue(items: QueueItem[]) {
  const storage = await getStorage()
  if (!storage) return
  await storage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export async function enqueue(item: Omit<QueueItem, 'id' | 'createdAt'>) {
  const q = await getQueue()
  q.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  } as QueueItem)
  await setQueue(q)
}

export async function flushQueue(): Promise<{ synced: number; remaining: number }> {
  const q = await getQueue()
  if (q.length === 0) return { synced: 0, remaining: 0 }

  const remaining: QueueItem[] = []
  let synced = 0

  for (const item of q) {
    try {
      if (item.type === 'stock_inward') {
        await submitStockInward(item.payload)
      } else {
        await submitProcessingEntryAtomic({
          lotId: item.payload.lotId,
          batchId: item.payload.batchId,
          processingTypeId: item.payload.processingTypeId,
          countRangeId: item.payload.countRangeId,
          memberWeights: item.payload.memberWeights,
          ratePerKgSnapshot: item.payload.ratePerKgSnapshot,
        })
      }
      synced += 1
    } catch {
      remaining.push(item)
    }
  }

  await setQueue(remaining)
  return { synced, remaining: remaining.length }
}

export async function flushQueueDetailed(): Promise<{
  synced: number
  remaining: number
  failures: Array<{ id: string; type: QueueItem['type']; reason: string }>
}> {
  const q = await getQueue()
  if (q.length === 0) return { synced: 0, remaining: 0, failures: [] }

  const remaining: QueueItem[] = []
  const failures: Array<{ id: string; type: QueueItem['type']; reason: string }> = []
  let synced = 0

  for (const item of q) {
    try {
      if (item.type === 'stock_inward') {
        await submitStockInward(item.payload)
      } else {
        await submitProcessingEntryAtomic({
          lotId: item.payload.lotId,
          batchId: item.payload.batchId,
          processingTypeId: item.payload.processingTypeId,
          countRangeId: item.payload.countRangeId,
          memberWeights: item.payload.memberWeights,
          ratePerKgSnapshot: item.payload.ratePerKgSnapshot,
        })
      }
      synced += 1
    } catch (error) {
      remaining.push(item)
      failures.push({
        id: item.id,
        type: item.type,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  await setQueue(remaining)
  return { synced, remaining: remaining.length, failures }
}
