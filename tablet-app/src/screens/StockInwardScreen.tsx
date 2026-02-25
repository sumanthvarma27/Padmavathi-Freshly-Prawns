import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { PickerField } from '../components/PickerField'
import type { MasterData } from '../types/db'
import { submitStockInward } from '../lib/transactions'
import type { StockInwardContext } from '../types/workflow'

export function StockInwardScreen({
  masterData,
  onStockSaved,
}: {
  masterData: MasterData
  onStockSaved: (stock: StockInwardContext) => void
}) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [shedId, setShedId] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [rawWeightKg, setRawWeightKg] = useState('')
  const [saving, setSaving] = useState(false)

  const onSave = async () => {
    const weight = Number(rawWeightKg)
    if (!entryDate || !shedId || !companyId || Number.isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid input', 'Fill all required fields with valid values.')
      return
    }

    setSaving(true)
    try {
      await submitStockInward({
        entryDate,
        shedId,
        companyId,
        rawWeightKg: weight,
      })

      const shedLabel = masterData.sheds.find((item) => item.id === shedId)?.label || 'Unknown Shed'
      const companyLabel = masterData.companies.find((item) => item.id === companyId)?.label || 'Unknown Company'
      onStockSaved({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        entryDate,
        shedId,
        shedLabel,
        companyId,
        companyLabel,
        rawWeightKg: weight,
        processedWeightKg: 0,
        status: 'open',
      })

      setRawWeightKg('')
      Alert.alert('Saved', 'Stock inward entry saved successfully.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save stock inward entry.'
      Alert.alert('Save failed', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stock Inward</Text>

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

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Stock Inward'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
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
