import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { PickerField } from '../components/PickerField'
import { QRScannerModal } from '../components/QRScannerModal'
import type { MasterData } from '../types/db'
import { getWorkerRate } from '../lib/rates'
import { saveMemberWeightsBestEffort, submitProcessingEntry } from '../lib/transactions'
import type { StockInwardContext } from '../types/workflow'

export function ProcessingEntryScreen({
  masterData,
  selectedStock,
  onProcessingSaved,
}: {
  masterData: MasterData
  selectedStock: StockInwardContext | null
  onProcessingSaved: (processedWeightKg: number) => void
}) {
  const [batchId, setBatchId] = useState('')
  const [processingTypeId, setProcessingTypeId] = useState('')
  const [countRangeId, setCountRangeId] = useState('')
  const [memberWeights, setMemberWeights] = useState<Record<string, string>>({})
  const [ratePerKg, setRatePerKg] = useState<number | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const batchCode = useMemo(() => {
    const selected = masterData.batches.find((batch) => batch.id === batchId)
    return selected?.batchCode || ''
  }, [masterData.batches, batchId])

  const batchMembers = useMemo(
    () => masterData.batchMembers.filter((member) => member.batchId === batchId),
    [masterData.batchMembers, batchId]
  )

  const totalWeightKg = useMemo(() => {
    return batchMembers.reduce((sum, member) => {
      const weight = Number(memberWeights[member.id] || 0)
      if (Number.isNaN(weight) || weight < 0) return sum
      return sum + weight
    }, 0)
  }, [batchMembers, memberWeights])

  const amountPreview = useMemo(() => {
    const weight = totalWeightKg
    if (Number.isNaN(weight) || weight <= 0 || ratePerKg == null) return null
    return Number((weight * ratePerKg).toFixed(2))
  }, [totalWeightKg, ratePerKg])

  const onScanResult = (code: string) => {
    const normalized = code.trim()
    const matched = masterData.batches.find((batch) => batch.batchCode === normalized)
    if (!matched) {
      Alert.alert('Invalid QR', `No active batch found for code: ${normalized}`)
      return
    }
    setBatchId(matched.id)
    setMemberWeights({})
  }

  const onSelectBatch = (value: string) => {
    setBatchId(value)
    setMemberWeights({})
  }

  const onLookupRate = async () => {
    if (!processingTypeId || !countRangeId) {
      Alert.alert('Missing fields', 'Select processing type and count range first.')
      return
    }
    if (!selectedStock) {
      Alert.alert('Select stock inward', 'Create or select a stock inward first.')
      return
    }
    if (selectedStock.status === 'closed') {
      Alert.alert('Stock closed', 'Selected stock inward is closed. Create/select an open stock inward.')
      return
    }

    try {
      const rate = await getWorkerRate({
        processingTypeId,
        countRangeId,
        effectiveAt: `${selectedStock.entryDate}T00:00:00`,
      })
      setRatePerKg(rate)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rate lookup failed.'
      Alert.alert('Rate not found', message)
    }
  }

  const onSave = async () => {
    const weight = totalWeightKg
    if (!selectedStock) {
      Alert.alert('Select stock inward', 'Create or select a stock inward first.')
      return
    }
    if (selectedStock.status === 'closed') {
      Alert.alert('Stock closed', 'Selected stock inward is closed. Create/select an open stock inward.')
      return
    }
    if (!batchId || !processingTypeId || !countRangeId) {
      Alert.alert('Missing fields', 'Fill all required fields.')
      return
    }
    if (Number.isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid weight', 'Processed weight must be greater than 0.')
      return
    }
    if (ratePerKg == null) {
      Alert.alert('Rate missing', 'Lookup worker rate before saving.')
      return
    }
    if (batchMembers.length === 0) {
      Alert.alert('No members', 'Selected batch has no active members.')
      return
    }

    const selectedMemberWeights = batchMembers
      .map((member) => ({
        memberId: member.id,
        weightKg: Number(memberWeights[member.id] || 0),
      }))
      .filter((entry) => !Number.isNaN(entry.weightKg) && entry.weightKg > 0)

    if (selectedMemberWeights.length === 0) {
      Alert.alert('No member weights', 'Enter at least one member weight.')
      return
    }
    const remaining = selectedStock.rawWeightKg - selectedStock.processedWeightKg
    if (weight > remaining) {
      Alert.alert('Exceeds available stock', `Only ${remaining.toFixed(2)} kg is left in selected stock inward.`)
      return
    }

    setSaving(true)
    try {
      const result = await submitProcessingEntry({
        entryDate: selectedStock.entryDate,
        shedId: selectedStock.shedId,
        companyId: selectedStock.companyId,
        batchId,
        processingTypeId,
        countRangeId,
        processedWeightKg: weight,
        ratePerKgSnapshot: ratePerKg,
      })

      await saveMemberWeightsBestEffort({
        processingEntryId: result.processingEntryId,
        memberWeights: selectedMemberWeights,
      })

      onProcessingSaved(weight)
      setMemberWeights({})
      Alert.alert('Saved', `Processing entry saved. Amount: ${result.amountSnapshot.toFixed(2)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save processing entry.'
      Alert.alert('Save failed', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing Entry</Text>

      {!selectedStock ? (
        <Text style={styles.warning}>Select a stock inward first from the stock list above.</Text>
      ) : (
        <View style={styles.stockCard}>
          <Text style={styles.stockCardTitle}>Selected Stock Inward</Text>
          <Text style={styles.stockCardText}>Date: {selectedStock.entryDate}</Text>
          <Text style={styles.stockCardText}>Shed: {selectedStock.shedLabel}</Text>
          <Text style={styles.stockCardText}>Company: {selectedStock.companyLabel}</Text>
          <Text style={styles.stockCardText}>Raw: {selectedStock.rawWeightKg.toFixed(2)} kg</Text>
          <Text style={styles.stockCardText}>Used: {selectedStock.processedWeightKg.toFixed(2)} kg</Text>
          <Text style={styles.stockCardText}>Balance: {(selectedStock.rawWeightKg - selectedStock.processedWeightKg).toFixed(2)} kg</Text>
          <Text style={styles.stockCardText}>Status: {selectedStock.status.toUpperCase()}</Text>
        </View>
      )}

      <PickerField label="Batch" selectedValue={batchId} options={masterData.batches} onValueChange={onSelectBatch} />

      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={() => setScannerOpen(true)}>
          <Text style={styles.secondaryButtonText}>Scan Batch QR</Text>
        </Pressable>
        <Text style={styles.codeText}>{batchCode ? `Code: ${batchCode}` : 'No batch scanned'}</Text>
      </View>

      <PickerField
        label="Processing Type"
        selectedValue={processingTypeId}
        options={masterData.processingTypes}
        onValueChange={(value) => {
          setProcessingTypeId(value)
          setRatePerKg(null)
        }}
      />
      <PickerField
        label="Count Range"
        selectedValue={countRangeId}
        options={masterData.countRanges}
        onValueChange={(value) => {
          setCountRangeId(value)
          setRatePerKg(null)
        }}
      />

      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={onLookupRate}>
          <Text style={styles.secondaryButtonText}>Lookup Rate</Text>
        </Pressable>
        <Text style={styles.rateText}>{ratePerKg == null ? 'Rate: -' : `Rate: ${ratePerKg.toFixed(2)} / kg`}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Batch Members (enter individual weights)</Text>
        {batchId ? (
          batchMembers.length > 0 ? (
            <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
              {batchMembers.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{member.label}</Text>
                  <TextInput
                    style={styles.memberInput}
                    value={memberWeights[member.id] || ''}
                    onChangeText={(value) => setMemberWeights((prev) => ({ ...prev, [member.id]: value }))}
                    keyboardType="decimal-pad"
                    placeholder="kg"
                  />
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.note}>No active members in this batch.</Text>
          )
        ) : (
          <Text style={styles.note}>Select batch to load members.</Text>
        )}
      </View>

      <Text style={styles.totalWeight}>Total Weight: {totalWeightKg.toFixed(2)} kg</Text>
      <Text style={styles.amount}>{amountPreview == null ? 'Amount: -' : `Amount: ${amountPreview.toFixed(2)}`}</Text>

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Processing Entry'}</Text>
      </Pressable>

      <QRScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onBatchCodeScanned={onScanResult} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: { color: '#fff', fontWeight: '700' },
  codeText: { color: '#334155', fontWeight: '600' },
  rateText: { color: '#0f172a', fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },
  totalWeight: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  warning: {
    color: '#b45309',
    fontWeight: '700',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
  },
  stockCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    gap: 4,
  },
  stockCardTitle: { fontWeight: '800', color: '#0f172a' },
  stockCardText: { color: '#334155', fontWeight: '600' },
  memberList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  memberListContent: { padding: 10, gap: 8 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  memberName: { flex: 1, color: '#0f172a', fontWeight: '600' },
  memberInput: {
    width: 90,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    textAlign: 'right',
    backgroundColor: '#fff',
  },
  note: { color: '#64748b', fontSize: 13 },
  button: {
    marginTop: 6,
    backgroundColor: '#15803d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
