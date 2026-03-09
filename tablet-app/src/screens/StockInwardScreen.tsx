import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { PickerField } from '../components/PickerField'
import type { MasterData } from '../types/db'
import { submitStockInward } from '../lib/transactions'
import { enqueue } from '../lib/offline-queue'

function isLikelyNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('offline')
  )
}

export function StockInwardScreen({
  masterData,
  onStockSaved,
}: {
  masterData: MasterData
  onStockSaved: (lotId?: string) => void
}) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [shedId, setShedId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [rawWeightKg, setRawWeightKg] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const onSave = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const weight = Number(rawWeightKg)
    if (!entryDate) {
      setErrorMsg('Entry date is required.')
      return
    }
    if (!shedId) {
      setErrorMsg('Please select a Shed.')
      return
    }
    if (!companyId) {
      setErrorMsg('Please select a Company.')
      return
    }
    if (Number.isNaN(weight) || weight <= 0) {
      setErrorMsg('Raw weight must be a positive number.')
      return
    }

    setSaving(true)
    try {
      const saved = await submitStockInward({
        entryDate,
        shedId,
        companyId,
        rawWeightKg: weight,
      })

      onStockSaved(saved.lotId)
      setRawWeightKg('')
      setSuccessMsg(`✓ Stock inward saved successfully.`)
    } catch (error) {
      console.error('[StockInward] save failed:', error)

      if (isLikelyNetworkError(error)) {
        await enqueue({
          type: 'stock_inward',
          payload: {
            entryDate,
            shedId,
            companyId,
            rawWeightKg: weight,
          },
        })
        setSuccessMsg('Queued offline — will sync when internet is available.')
        onStockSaved(undefined)
        return
      }

      const message = error instanceof Error ? error.message : 'Failed to save stock inward entry.'
      setErrorMsg(`Save failed: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formHeader}>
        <Text style={styles.title}>New Stock Inward Entry</Text>
        <Text style={styles.subtitle}>Fill in the details below and tap Save to record a new inward</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Entry Date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={entryDate} onChangeText={setEntryDate} />
      </View>

      <PickerField label="Shed" selectedValue={shedId} options={masterData.sheds} onValueChange={setShedId} />
      <PickerField label="Company" selectedValue={companyId} options={masterData.companies} onValueChange={setCompanyId} />

      <View style={styles.field}>
        <Text style={styles.label}>Raw Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={rawWeightKg}
          onChangeText={setRawWeightKg}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {errorMsg}</Text>
        </View>
      ) : null}

      {successMsg ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Stock Inward'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  formHeader: { gap: 4, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },
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
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: '#b91c1c', fontWeight: '700', fontSize: 13 },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 10,
  },
  successText: { color: '#15803d', fontWeight: '700', fontSize: 13 },
  button: {
    marginTop: 8,
    backgroundColor: '#15803d',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
