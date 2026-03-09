import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { fetchMasterData } from '../lib/master-data'
import { fetchOpenAndClosedLots, closeLot } from '../lib/lots'
import { flushQueueDetailed, getQueue } from '../lib/offline-queue'
import type { MasterData } from '../types/db'
import { StockInwardScreen } from './StockInwardScreen'
import { ProcessingEntryScreen } from './ProcessingEntryScreen'
import type { StockInwardContext } from '../types/workflow'

// ─── Active section tabs ──────────────────────────────────────────────────────
type ActiveSection = 'stock_inward' | 'processing'

export function HomeScreen() {
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [masterData, setMasterData] = useState<MasterData | null>(null)
  const [stockContexts, setStockContexts] = useState<StockInwardContext[]>([])
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null)
  const [unsyncedCount, setUnsyncedCount] = useState(0)
  const [activeSection, setActiveSection] = useState<ActiveSection>('stock_inward')
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const scrollRef = useRef<ScrollView>(null)

  const refreshUnsyncedCount = useCallback(() => {
    getQueue().then((queue) => setUnsyncedCount(queue.length))
  }, [])

  const refreshLots = useCallback(async (data: MasterData) => {
    const lots = await fetchOpenAndClosedLots(data)
    setStockContexts(lots)
    setSelectedStockId((prev) => {
      if (prev && lots.some((item) => item.id === prev)) return prev
      return lots.find((item) => item.status === 'open')?.id || lots[0]?.id || null
    })
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const data = await fetchMasterData()
        if (!active) return
        setMasterData(data)
        await refreshLots(data)
        refreshUnsyncedCount()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load master data'
        Alert.alert('Load failed', message)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [refreshLots, refreshUnsyncedCount])

  const onSignOut = async () => {
    await supabase.auth.signOut()
  }

  const onSyncNow = async () => {
    setSyncing(true)
    setSyncStatus(null)
    try {
      const result = await flushQueueDetailed()
      if (masterData) await refreshLots(masterData)
      refreshUnsyncedCount()
      if (result.failures.length > 0) {
        const preview = result.failures
          .slice(0, 2)
          .map((f) => `${f.type}: ${f.reason}`)
          .join('\n')
        setSyncStatus({
          type: 'info',
          message: `Sync partial. Synced ${result.synced}, remaining ${result.remaining}. ${preview}`,
        })
        Alert.alert(
          'Sync partial',
          `Synced ${result.synced}. Remaining ${result.remaining}.\n\n${preview}`
        )
      } else {
        setSyncStatus({
          type: 'success',
          message: `Sync complete. Synced ${result.synced}, remaining ${result.remaining}.`,
        })
        Alert.alert('Sync complete', `Synced ${result.synced}. Remaining ${result.remaining}.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      setSyncStatus({ type: 'error', message: `Sync failed: ${message}` })
      Alert.alert('Sync failed', message)
    } finally {
      setSyncing(false)
    }
  }

  const selectedStock = stockContexts.find((item) => item.id === selectedStockId) || null

  const onStockSaved = async (lotId?: string) => {
    if (!masterData) return
    await refreshLots(masterData)
    refreshUnsyncedCount()
    if (lotId) setSelectedStockId(lotId)
    // After saving a stock inward, stay on stock_inward tab to show updated list
  }

  const onProcessingSaved = async () => {
    if (!masterData) return
    await refreshLots(masterData)
    refreshUnsyncedCount()
  }

  const closeSelectedStock = async () => {
    if (!selectedStockId || !selectedStock) {
      Alert.alert('No stock selected', 'Select a stock inward first.')
      return
    }
    if (selectedStock.status === 'closed') {
      Alert.alert('Already closed', 'Selected lot is already closed.')
      return
    }
    if (unsyncedCount > 0) {
      Alert.alert('Cannot close', 'Sync pending entries first, then close this lot.')
      return
    }
    try {
      await closeLot(selectedStockId, 'Closed from tablet day-end flow')
      if (masterData) await refreshLots(masterData)
      Alert.alert('Lot closed', 'Selected stock inward has been closed.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close stock inward'
      Alert.alert('Close failed', message)
    }
  }

  // Navigate to Processing Entry for a specific lot
  const onGoToProcessing = (lotId: string) => {
    setSelectedStockId(lotId)
    setActiveSection('processing')
    // Scroll to top of content area so processing entry is visible
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    }, 100)
  }

  const todaySummary = useMemo(() => {
    const openLots = stockContexts.filter((item) => item.status === 'open')
    const raw = stockContexts.reduce((sum, item) => sum + item.rawWeightKg, 0)
    const processed = stockContexts.reduce((sum, item) => sum + item.processedWeightKg, 0)
    const remaining = Number((raw - processed).toFixed(2))
    return {
      openLots: openLots.length,
      raw: Number(raw.toFixed(2)),
      processed: Number(processed.toFixed(2)),
      remaining,
    }
  }, [stockContexts])

  if (loading || !masterData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading master data...</Text>
      </View>
    )
  }

  return (
    <View style={styles.page}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Shed Operations</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.closeButton, (!selectedStock || selectedStock.status === 'closed' || unsyncedCount > 0) && styles.disabled]}
            onPress={closeSelectedStock}
            disabled={!selectedStock || selectedStock.status === 'closed' || unsyncedCount > 0}
          >
            <Text style={styles.closeButtonText}>Close Lot</Text>
          </Pressable>
          <Pressable style={[styles.syncButton, syncing && styles.disabled]} onPress={onSyncNow} disabled={syncing}>
            <Text style={styles.syncButtonText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </Pressable>
          <Pressable style={styles.signOut} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Summary Strip ──────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Open Lots</Text>
          <Text style={styles.summaryValue}>{todaySummary.openLots}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Processed / Remaining</Text>
          <Text style={styles.summaryValue}>
            {todaySummary.processed.toFixed(1)} / {todaySummary.remaining.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unsynced</Text>
          <Text style={[styles.summaryValue, unsyncedCount > 0 && styles.warningValue]}>
            {unsyncedCount}
          </Text>
        </View>
      </View>
      {syncStatus && (
        <View
          style={[
            styles.syncStatusBox,
            syncStatus.type === 'success' && styles.syncStatusSuccess,
            syncStatus.type === 'error' && styles.syncStatusError,
            syncStatus.type === 'info' && styles.syncStatusInfo,
          ]}
        >
          <Text style={styles.syncStatusText}>{syncStatus.message}</Text>
        </View>
      )}

      {/* ── Section Tabs ───────────────────────────────────── */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeSection === 'stock_inward' && styles.tabActive]}
          onPress={() => setActiveSection('stock_inward')}
        >
          <Text style={[styles.tabText, activeSection === 'stock_inward' && styles.tabTextActive]}>
            📦 Stock Inward
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeSection === 'processing' && styles.tabActive]}
          onPress={() => setActiveSection('processing')}
        >
          <Text style={[styles.tabText, activeSection === 'processing' && styles.tabTextActive]}>
            ⚙️ Processing Entry
          </Text>
          {selectedStock && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {selectedStock.shedLabel} · {selectedStock.companyLabel}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Content ────────────────────────────────────────── */}
      <ScrollView ref={scrollRef} style={styles.content} contentContainerStyle={styles.contentWrap}>
        {activeSection === 'stock_inward' ? (
          <>
            {/* Stock Inward Form */}
            <View style={styles.sectionCard}>
              <StockInwardScreen masterData={masterData} onStockSaved={onStockSaved} />
            </View>

            {/* Stock Inwards List */}
            <View style={styles.sectionCard}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Stock Inwards</Text>
                <Text style={styles.listSubtitle}>{stockContexts.length} records</Text>
              </View>

              {stockContexts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No stock inwards yet. Save one above to get started.</Text>
                </View>
              ) : (
                <View style={styles.inwardList}>
                  {/* Column Headers */}
                  <View style={styles.inwardTableHeader}>
                    <Text style={[styles.colHeader, { flex: 2 }]}>Date · Shed · Company</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Raw (kg)</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Balance</Text>
                    <Text style={[styles.colHeader, { width: 72, textAlign: 'center' }]}>Status</Text>
                    <Text style={[styles.colHeader, { width: 112, textAlign: 'center' }]}>Action</Text>
                  </View>

                  {stockContexts.map((stock, index) => {
                    const balance = stock.rawWeightKg - stock.processedWeightKg
                    const isClosed = stock.status === 'closed'
                    const isSelected = stock.id === selectedStockId

                    return (
                      <View
                        key={stock.id}
                        style={[
                          styles.inwardRow,
                          index % 2 === 0 && styles.inwardRowAlt,
                          isSelected && styles.inwardRowSelected,
                        ]}
                      >
                        {/* Label column */}
                        <View style={{ flex: 2 }}>
                          <Text style={styles.inwardLabel}>
                            {stock.entryDate}
                          </Text>
                          <Text style={styles.inwardSub}>
                            {stock.shedLabel} · {stock.companyLabel}
                          </Text>
                        </View>

                        {/* Raw weight */}
                        <Text style={[styles.inwardNum, { flex: 1, textAlign: 'right' }]}>
                          {stock.rawWeightKg.toFixed(1)}
                        </Text>

                        {/* Balance */}
                        <Text
                          style={[
                            styles.inwardNum,
                            { flex: 1, textAlign: 'right' },
                            balance <= 0 && styles.inwardNumDone,
                          ]}
                        >
                          {balance.toFixed(1)}
                        </Text>

                        {/* Status badge */}
                        <View style={{ width: 72, alignItems: 'center' }}>
                          <View style={[styles.statusBadge, isClosed ? styles.statusClosed : styles.statusOpen]}>
                            <Text style={styles.statusBadgeText}>
                              {isClosed ? 'CLOSED' : 'OPEN'}
                            </Text>
                          </View>
                        </View>

                        {/* Process button */}
                        <View style={{ width: 112, alignItems: 'center' }}>
                          <Pressable
                            style={[
                              styles.processBtn,
                              isClosed && styles.processBtnDisabled,
                            ]}
                            onPress={() => onGoToProcessing(stock.id)}
                            disabled={isClosed}
                          >
                            <Text style={styles.processBtnText}>
                              {isClosed ? 'Closed' : 'Process →'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          /* Processing Entry Section */
          <View style={styles.sectionCard}>
            {/* Selected stock context banner */}
            {selectedStock && (
              <View style={styles.processingBanner}>
                <View style={styles.processingBannerInfo}>
                  <Text style={styles.processingBannerTitle}>
                    Processing: {selectedStock.shedLabel} · {selectedStock.companyLabel}
                  </Text>
                  <Text style={styles.processingBannerSub}>
                    Date: {selectedStock.entryDate} · Raw: {selectedStock.rawWeightKg.toFixed(1)} kg ·
                    Balance: {(selectedStock.rawWeightKg - selectedStock.processedWeightKg).toFixed(1)} kg
                  </Text>
                </View>
                <Pressable
                  style={styles.changeLotBtn}
                  onPress={() => setActiveSection('stock_inward')}
                >
                  <Text style={styles.changeLotBtnText}>← Change Lot</Text>
                </Pressable>
              </View>
            )}

            {!selectedStock && (
              <View style={styles.noStockBanner}>
                <Text style={styles.noStockText}>
                  No stock lot selected. Go to{' '}
                  <Text style={styles.linkText} onPress={() => setActiveSection('stock_inward')}>
                    Stock Inward
                  </Text>{' '}
                  and click &quot;Process -&gt;&quot; on a lot.
                </Text>
              </View>
            )}

            <ProcessingEntryScreen
              masterData={masterData}
              selectedStock={selectedStock}
              onProcessingSaved={onProcessingSaved}
            />
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#64748b' },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  signOut: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  signOutText: { color: '#334155', fontWeight: '600', fontSize: 13 },
  syncButton: {
    borderRadius: 8,
    backgroundColor: '#0f766e',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  closeButton: {
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabled: { opacity: 0.45 },

  // Summary
  summaryRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  summaryLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  warningValue: { color: '#b91c1c' },
  syncStatusBox: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  syncStatusSuccess: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  syncStatusError: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  syncStatusInfo: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  syncStatusText: { color: '#0f172a', fontWeight: '600', fontSize: 13 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabActive: { borderBottomColor: '#15803d' },
  tabText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#15803d' },
  tabBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabBadgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },

  // Content
  content: { flex: 1 },
  contentWrap: { padding: 16, gap: 14, paddingBottom: 32 },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    padding: 14,
  },

  // Stock Inwards List
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  listSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  inwardList: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  inwardTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  colHeader: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  inwardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  inwardRowAlt: { backgroundColor: '#fafafa' },
  inwardRowSelected: { backgroundColor: '#f0fdf4' },
  inwardLabel: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  inwardSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  inwardNum: { color: '#334155', fontWeight: '700', fontSize: 13 },
  inwardNumDone: { color: '#16a34a' },

  // Status badge
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusOpen: { backgroundColor: '#dcfce7' },
  statusClosed: { backgroundColor: '#e2e8f0' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', color: '#374151' },

  // Process button in list
  processBtn: {
    backgroundColor: '#15803d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  processBtnDisabled: { backgroundColor: '#cbd5e1' },
  processBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Processing tab banner
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  processingBannerInfo: { flex: 1 },
  processingBannerTitle: { fontWeight: '800', color: '#166534', fontSize: 14 },
  processingBannerSub: { color: '#15803d', fontSize: 12, marginTop: 2 },
  changeLotBtn: {
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  changeLotBtnText: { color: '#15803d', fontWeight: '700', fontSize: 13 },

  noStockBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  noStockText: { color: '#92400e', fontWeight: '600', fontSize: 13 },
  linkText: { color: '#15803d', textDecorationLine: 'underline', fontWeight: '700' },
})
