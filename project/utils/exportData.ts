import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getApiBaseUrl } from './env';

const EXPORT_FILENAME = 'agrismart-export-latest.pdf';

function persistentExportUri(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${EXPORT_FILENAME}` : null;
}

async function sharePdf(uri: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle,
    });
  }
}

type Info = Awaited<ReturnType<typeof FileSystem.getInfoAsync>>;

function isNonEmptyFileInfo(info: Info): boolean {
  if (!info.exists || info.isDirectory) return false;
  return info.size > 0;
}

/** True if a previous export PDF exists on disk (for offline reuse). */
export async function hasOfflineExportCache(): Promise<boolean> {
  const path = persistentExportUri();
  if (!path) return false;
  const info = await FileSystem.getInfoAsync(path);
  return isNonEmptyFileInfo(info);
}

/**
 * Downloads PDF from GET /api/farmer/export-data, saves a copy for offline use, and opens share.
 * If the network request fails but a previous export exists, prompts to open that file offline.
 */
export async function downloadAndShareFarmerPdf(): Promise<void> {
  const base = getApiBaseUrl();
  const token = await AsyncStorage.getItem('authToken');
  if (!token) {
    throw new Error('You must be logged in to download your data.');
  }

  const cacheDest = `${FileSystem.cacheDirectory ?? ''}agrismart-my-data-export.pdf`;
  const persistentDest = persistentExportUri();

  const tryOfflineFallback = (originalError: unknown): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!persistentDest) {
        reject(originalError);
        return;
      }
      void FileSystem.getInfoAsync(persistentDest)
        .then((info) => {
          if (!isNonEmptyFileInfo(info)) {
            reject(originalError);
            return;
          }
          Alert.alert(
            'Offline or server unavailable',
            'Open the last PDF saved on this device? Connect to the internet later to download an updated export.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => reject(originalError),
              },
              {
                text: 'Open last export',
                onPress: () => {
                  void (async () => {
                    try {
                      await sharePdf(persistentDest, 'AgriSmart export (saved on device)');
                      resolve();
                    } catch (err) {
                      reject(err instanceof Error ? err : new Error(String(err)));
                    }
                  })();
                },
              },
            ],
          );
        })
        .catch(() => reject(originalError));
    });

  try {
    const result = await FileSystem.downloadAsync(
      `${base}/api/farmer/export-data`,
      cacheDest,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (result.status !== 200) {
      throw new Error(
        `Download failed (${result.status}). Check your connection and that the backend is running.`,
      );
    }
    if (persistentDest) {
      await FileSystem.copyAsync({ from: result.uri, to: persistentDest });
      await AsyncStorage.setItem('agrismartLastExportAt', new Date().toISOString());
      await sharePdf(persistentDest, 'Save or share your AgriSmart export');
    } else {
      await sharePdf(result.uri, 'Save or share your AgriSmart export');
    }
  } catch (e) {
    try {
      await tryOfflineFallback(e);
    } catch (inner) {
      const err = inner instanceof Error ? inner : new Error(String(inner));
      throw err;
    }
  }
}
