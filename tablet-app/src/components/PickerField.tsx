import { Picker } from '@react-native-picker/picker'
import { StyleSheet, Text, View } from 'react-native'
import type { Option } from '../types/db'

export function PickerField({
  label,
  selectedValue,
  options,
  onValueChange,
  placeholder,
}: {
  label: string
  selectedValue: string
  options: Option[]
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
          <Picker.Item label={placeholder || `Select ${label}`} value="" />
          {options.map((option) => (
            <Picker.Item key={option.id} label={option.label} value={option.id} />
          ))}
        </Picker>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
})
