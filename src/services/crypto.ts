// Web Crypto API Zero-Knowledge Security Service
// Uses PBKDF2 (SHA-256, 100,000 iterations) + AES-GCM 256-bit

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256;
const VERIFICATION_PHRASE = "FINTRACK_ZERO_KNOWLEDGE_AUTH_OK";

// Check if Web Crypto API is available (requires HTTPS or localhost on mobile browsers)
export function isSecureCryptoSupported(): boolean {
  return typeof window !== 'undefined' && !!window.crypto && !!window.crypto.subtle;
}

// ArrayBuffer <-> Base64 helpers
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate random cryptographic salt (16 bytes)
export function generateSalt(): Uint8Array {
  if (!isSecureCryptoSupported()) {
    throw new Error('Web Crypto API requires an HTTPS secure connection on mobile browsers.');
  }
  return window.crypto.getRandomValues(new Uint8Array(16));
}

// Generate random IV (12 bytes for AES-GCM)
export function generateIV(): Uint8Array {
  if (!isSecureCryptoSupported()) {
    throw new Error('Web Crypto API requires an HTTPS secure connection on mobile browsers.');
  }
  return window.crypto.getRandomValues(new Uint8Array(12));
}

// Derive AES-GCM key from Master Password and Salt
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  if (!isSecureCryptoSupported()) {
    throw new Error('Web Crypto API requires an HTTPS secure connection on mobile browsers.');
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // Non-extractable for ephemeral memory safety
    ['encrypt', 'decrypt']
  );
}

// Encrypt a Javascript object/string using derived CryptoKey
export async function encryptData<T>(key: CryptoKey, data: T): Promise<{ cipherText: string; iv: string }> {
  if (!isSecureCryptoSupported()) {
    throw new Error('Web Crypto API requires an HTTPS secure connection on mobile browsers.');
  }

  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  const dataBuffer = encoder.encode(jsonString);
  const iv = generateIV();

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource
    },
    key,
    dataBuffer
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer)
  };
}

// Decrypt ciphertext using derived CryptoKey
export async function decryptData<T>(key: CryptoKey, cipherTextBase64: string, ivBase64: string): Promise<T> {
  if (!isSecureCryptoSupported()) {
    throw new Error('Web Crypto API requires an HTTPS secure connection on mobile browsers.');
  }

  const cipherBuffer = base64ToBuffer(cipherTextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer) as unknown as BufferSource
    },
    key,
    cipherBuffer
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

// Verification token creation during onboarding
export async function createAuthVerification(key: CryptoKey): Promise<{ verificationPayload: string; iv: string }> {
  const encrypted = await encryptData(key, VERIFICATION_PHRASE);
  return {
    verificationPayload: encrypted.cipherText,
    iv: encrypted.iv
  };
}

// Verify password against stored verification payload
export async function verifyPassword(key: CryptoKey, verificationPayload: string, iv: string): Promise<boolean> {
  try {
    const decrypted = await decryptData<string>(key, verificationPayload, iv);
    return decrypted === VERIFICATION_PHRASE;
  } catch (err) {
    return false;
  }
}
