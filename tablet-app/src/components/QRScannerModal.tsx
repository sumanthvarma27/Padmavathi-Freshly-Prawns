import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'

export function QRScannerModal({
  visible,
  onClose,
  onBatchCodeScanned,
}: {
  visible: boolean
  onClose: () => void
  onBatchCodeScanned: (batchCode: string) => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!visible) {
      setLocked(false)
    }
  }, [visible])

  const handleScan = (value: string) => {
    if (locked) return
    setLocked(true)
    onBatchCodeScanned(value)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {!permission?.granted ? (
          <View style={styles.center}>
            <Text style={styles.title}>Camera permission required</Text>
            <Pressable style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Grant Camera Access</Text>
            </Pressable>
            <Pressable style={styles.link} onPress={onClose}>
              <Text style={styles.linkText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(event) => handleScan(event.data)}
            />
            <View style={styles.footer}>
              <Text style={styles.footerText}>Scan batch QR code</Text>
              <Pressable style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  camera: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    gap: 12,
  },
  footerText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  button: {
    alignSelf: 'center',
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { padding: 8 },
  linkText: { color: '#93c5fd', fontWeight: '600' },
})
