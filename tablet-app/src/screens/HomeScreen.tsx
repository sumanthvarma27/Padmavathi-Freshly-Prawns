import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { fetchMasterData } from '../lib/master-data'
import type { MasterData } from '../types/db'
import { StockInwardScreen } from './StockInwardScreen'
import { ProcessingEntryScreen } from './ProcessingEntryScreen'
import type { StockInwardContext } from '../types/workflow'

export function HomeScreen() {
  const [loading, setLoading] = useState(true)
  const [masterData, setMasterData] = useState<MasterData | null>(null)
  const [stockContexts, setStockContexts] = useState<StockInwardContext[]>([])
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      try {
        const data = await fetchMasterData()
        if (!active) return
        setMasterData(data)
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
  }, [])

  const onSignOut = async () => {
    await supabase.auth.signOut()
  }

  const selectedStock = stockContexts.find((item) => item.id === selectedStockId) || null

  const onStockSaved = (stock: StockInwardContext) => {
    setStockContexts((prev) => [stock, ...prev])
    setSelectedStockId(stock.id)
  }

  const onProcessingSaved = (processedWeightKg: number) => {
    if (!selectedStockId) return
    setStockContexts((prev) =>
      prev.map((item) =>
        item.id === selectedStockId
          ? {
              ...item,
              processedWeightKg: Number((item.processedWeightKg + processedWeightKg).toFixed(2)),
            }
          : item
      )
    )
  }

  const closeSelectedStock = () => {
    if (!selectedStockId) {
      Alert.alert('No stock selected', 'Select a stock inward first.')
      return
    }

    setStockContexts((prev) =>
      prev.map((item) =>
        item.id === selectedStockId
          ? {
              ...item,
              status: 'closed',
              closedAt: new Date().toISOString(),
            }
          : item
      )
    )
  }

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
      <View style={styles.header}>
        <Text style={styles.title}>Shed Operations</Text>
        <Pressable style={styles.signOut} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.stockStrip}>
        <Text style={styles.stockStripTitle}>Stock Inwards (Create / Select / Close)</Text>
        {stockContexts.length === 0 ? (
          <Text style={styles.stockEmpty}>No stock inward created in this session yet.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockChips}>
            {stockContexts.map((stock) => {
              const isSelected = stock.id === selectedStockId
              const balance = stock.rawWeightKg - stock.processedWeightKg
              const isClosed = stock.status === 'closed'

              return (
                <Pressable
                  key={stock.id}
                  style={[
                    styles.stockChip,
                    isSelected && styles.stockChipActive,
                    isClosed && styles.stockChipClosed,
                  ]}
                  onPress={() => setSelectedStockId(stock.id)}
                >
                  <Text style={[styles.stockChipTitle, isSelected && styles.stockChipTitleActive]}>
                    {stock.companyLabel} / {stock.shedLabel}
                  </Text>
                  <Text style={styles.stockChipSub}>Raw: {stock.rawWeightKg.toFixed(1)} kg</Text>
                  <Text style={styles.stockChipSub}>Used: {stock.processedWeightKg.toFixed(1)} kg</Text>
                  <Text style={styles.stockChipSub}>Bal: {balance.toFixed(1)} kg</Text>
                  <Text style={styles.stockChipStatus}>{isClosed ? 'CLOSED' : 'OPEN'}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        )}

        <View style={styles.stockActions}>
          <Pressable
            style={[
              styles.closeButton,
              (!selectedStock || selectedStock.status === 'closed') && styles.closeButtonDisabled,
            ]}
            onPress={closeSelectedStock}
            disabled={!selectedStock || selectedStock.status === 'closed'}
          >
            <Text style={styles.closeButtonText}>Close Selected Stock Inward</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentWrap}>
        <View style={styles.sectionCard}>
          <StockInwardScreen masterData={masterData} onStockSaved={onStockSaved} />
        </View>

        <View style={styles.sectionCard}>
          <ProcessingEntryScreen
            masterData={masterData}
            selectedStock={selectedStock}
            onProcessingSaved={onProcessingSaved}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  muted: { color: '#64748b' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  signOut: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  signOutText: { color: '#334155', fontWeight: '600' },
  stockStrip: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  stockStripTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  stockEmpty: { color: '#64748b', fontSize: 13 },
  stockChips: { gap: 8, paddingVertical: 4 },
  stockChip: {
    minWidth: 190,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
    gap: 2,
  },
  stockChipActive: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  stockChipClosed: {
    opacity: 0.75,
    borderColor: '#94a3b8',
    backgroundColor: '#e2e8f0',
  },
  stockChipTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  stockChipTitleActive: { color: '#166534' },
  stockChipSub: { color: '#334155', fontSize: 12, fontWeight: '600' },
  stockChipStatus: { color: '#0f172a', fontSize: 11, fontWeight: '800', marginTop: 3 },
  stockActions: {
    paddingTop: 4,
  },
  closeButton: {
    borderRadius: 10,
    backgroundColor: '#b91c1c',
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  content: { flex: 1 },
  contentWrap: { padding: 16, paddingBottom: 28, gap: 12 },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
})
