import RNFS from 'react-native-fs';

// Backend configuration
// Replace with actual IP if running on physical device
export const BACKEND_URL = 'http://192.168.1.7:5000'; // Example IP, modify as needed during dev

export type DetectedObject = {
  name: string;
  score: number;
  distance: string;
  isDangerous: boolean;
  bbox: [number, number, number, number];
};

export type DetectResponse = {
  objects: DetectedObject[];
  count: number;
  error?: string;
};

export type VisionResponse = {
  guidance?: string;
  reply?: string;
  error?: string;
};

/**
 * Helper to convert local file path to base64 string
 */
async function getBase64FromPath(filePath: string): Promise<string> {
  const cleanPath = filePath.replace('file://', '');
  return await RNFS.readFile(cleanPath, 'base64');
}

/**
 * Object Detection for obstacles
 */
export async function detectObjects(photoPath: string): Promise<DetectResponse> {
  try {
    const base64Frame = await getBase64FromPath(photoPath);
    const response = await fetch(`${BACKEND_URL}/api/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frame: base64Frame }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('detectObjects error:', error);
    return { objects: [], count: 0, error: String(error) };
  }
}

/**
 * Vision for Sign Reading via Gemini
 */
export async function readSigns(photoPath: string, goal: string = 'destination', language: string = 'English'): Promise<VisionResponse> {
  try {
    const base64Frame = await getBase64FromPath(photoPath);
    const response = await fetch(`${BACKEND_URL}/api/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ frame: base64Frame, goal, language }),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('readSigns error:', error);
    return { error: String(error) };
  }
}
