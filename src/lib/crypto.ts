/**
 * AES-128 Encryption Utilities using Web Crypto API
 */

const KEY_SIZE = 16; // 128 bits

// Helper to convert string to ArrayBuffer
const strToBuffer = (str: string) => new TextEncoder().encode(str);

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Generate a 128-bit key from a password/passphrase
export async function generateKey(password: string): Promise<CryptoKey> {
  const pwBuf = strToBuffer(password);
  const hash = await crypto.subtle.digest('SHA-256', pwBuf);
  // Take first 16 bytes for AES-128
  const keyBuf = hash.slice(0, KEY_SIZE);
  
  return crypto.subtle.importKey(
    'raw',
    keyBuf,
    { name: 'AES-CBC' }, // Generic for import, we'll specify mode during encryption
    true, // Set to true so it can be exported and re-imported for different modes
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-128-CBC Encryption (for General Data)
 */
export async function encryptCBC(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const data = strToBuffer(text);
  
  // Re-import key specifically for CBC if needed, but usually we can just use the raw buffer
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const cbcKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-CBC' }, false, ['encrypt']);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    cbcKey,
    data
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer)
  };
}

/**
 * AES-128-GCM Encryption (for Sensitive Data)
 */
export async function encryptGCM(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM standard nonce is 12 bytes
  const data = strToBuffer(text);

  const rawKey = await crypto.subtle.exportKey('raw', key);
  const gcmKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    gcmKey,
    data
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer)
  };
}
