import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuthMetadata, saveAuthMetadata, clearAllLocalData } from '../db/repository';
import { deriveKey, generateSalt, createAuthVerification, verifyPassword, base64ToBuffer, bufferToBase64 } from '../services/crypto';

interface AuthKeyContextType {
  cryptoKey: CryptoKey | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  unlockSession: (password: string) => Promise<boolean>;
  setupMasterPassword: (password: string) => Promise<void>;
  lockSession: () => void;
  emergencyReset: () => Promise<void>;
}

const AuthKeyContext = createContext<AuthKeyContextType | undefined>(undefined);

export const AuthKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkInitialization = async () => {
    try {
      const authMeta = await getAuthMetadata();
      setIsInitialized(!!authMeta);
    } catch (e) {
      console.error('Failed to check auth initialization:', e);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkInitialization();
  }, []);

  const setupMasterPassword = async (password: string): Promise<void> => {
    const saltBytes = generateSalt();
    const derived = await deriveKey(password, saltBytes);
    const verification = await createAuthVerification(derived);

    await saveAuthMetadata({
      id: 'auth',
      salt: bufferToBase64(saltBytes.buffer as ArrayBuffer),
      verificationPayload: verification.verificationPayload,
      iv: verification.iv,
      createdAt: Date.now()
    });

    setCryptoKey(derived);
    setIsInitialized(true);
  };

  const unlockSession = async (password: string): Promise<boolean> => {
    const authMeta = await getAuthMetadata();
    if (!authMeta) return false;

    const saltBuffer = base64ToBuffer(authMeta.salt);
    const saltBytes = new Uint8Array(saltBuffer);
    const derived = await deriveKey(password, saltBytes);

    const isValid = await verifyPassword(derived, authMeta.verificationPayload, authMeta.iv);
    if (isValid) {
      setCryptoKey(derived);
      return true;
    }
    return false;
  };

  const lockSession = () => {
    setCryptoKey(null);
  };

  const emergencyReset = async () => {
    setCryptoKey(null);
    await clearAllLocalData();
    setIsInitialized(false);
  };

  return (
    <AuthKeyContext.Provider
      value={{
        cryptoKey,
        isAuthenticated: !!cryptoKey,
        isInitialized,
        isLoading,
        unlockSession,
        setupMasterPassword,
        lockSession,
        emergencyReset
      }}
    >
      {children}
    </AuthKeyContext.Provider>
  );
};

export const useAuthKey = () => {
  const context = useContext(AuthKeyContext);
  if (!context) {
    throw new Error('useAuthKey must be used within an AuthKeyProvider');
  }
  return context;
};
