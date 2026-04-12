import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, Camera, type BarcodeScanningResult } from 'expo-camera';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getGroupByInviteCode } from '../services/groups';

const JoinGroupScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Camera/QR
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHasCameraPermission(false);
      return;
    }
    Camera.requestCameraPermissionsAsync().then((res) => {
      setHasCameraPermission(res.status === 'granted');
    });
  }, []);

  const handleFoundCode = async (rawValue: string) => {
    const code = rawValue.trim().toUpperCase();
    if (code.length < 4) {
      setError('Invalid QR code.');
      return;
    }

    setScanning(false);
    setScanned(false);
    setError(null);
    setLoading(true);

    try {
      const group = await getGroupByInviteCode(code);
      if (!group) {
        setError('No group found for that code.');
        return;
      }
      navigation.navigate('GroupPreviewRequestAccess', { groupId: group.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read QR code.');
    } finally {
      setLoading(false);
    }
  };

  const trimmedCode = inviteCode.trim();

  const handleContinue = async () => {
    if (trimmedCode.length < 4) return;

    setError(null);
    setLoading(true);
    try {
      const code = trimmedCode.toUpperCase();
      const group = await getGroupByInviteCode(code);
      if (!group) {
        setError('No group found for that code.');
        return;
      }
      navigation.navigate('GroupPreviewRequestAccess', { groupId: group.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to look up the code.');
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    handleFoundCode(result.data);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* QR SCAN CARD */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Scan QR Code" />
        <Card.Content>
          {Platform.OS === 'web' ? (
            <Text style={styles.subtleText}>QR scanning is available on iOS/Android.</Text>
          ) : hasCameraPermission === false ? (
            <Text style={styles.error}>Camera permission is required to scan QR codes.</Text>
          ) : scanning ? (
            <View style={styles.scanner}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={onBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
            </View>
          ) : (
            <Text style={styles.subtleText}>Scan a group invite QR code.</Text>
          )}
        </Card.Content>

        <Card.Actions>
          {scanning ? (
            <Button
              mode="outlined"
              onPress={() => {
                setError(null);
                setScanning(false);
                setScanned(false);
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => {
                setError(null);
                setScanning(true);
                setScanned(false);
              }}
              disabled={Platform.OS === 'web' || hasCameraPermission !== true || loading}
              loading={loading}
            >
              Scan QR Code
            </Button>
          )}
        </Card.Actions>
      </Card>

      {/* MANUAL CODE CARD */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Enter Invite Code" />
        <Card.Content>
          <TextInput
            label="Invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
            autoCorrect={false}
            mode="outlined"
          />
          {error ? (
            <Text style={styles.error} variant="bodySmall">
              {error}
            </Text>
          ) : null}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleContinue}
            disabled={trimmedCode.length < 4 || loading}
            loading={loading}
          >
            Continue
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card: { borderRadius: 12 },
  subtleText: { color: '#6b7280' },
  error: { color: '#b91c1c', marginTop: 8 },
  scanner: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
});

export default JoinGroupScreen;
