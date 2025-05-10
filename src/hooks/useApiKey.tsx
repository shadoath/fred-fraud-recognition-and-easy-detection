import { useState, useEffect } from 'react';
import { API_KEY_STORAGE_KEY } from '../components/ApiKeySettings';

export interface ApiKeyState {
  apiKey: string | null;
  hasApiKey: boolean;
  isLoading: boolean;
  isOfflineMode: boolean;
}

/**
 * Custom hook to handle API key retrieval and management
 * @returns ApiKeyState containing API key information and offline mode status
 */
export const useApiKey = (): ApiKeyState => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
        const key = result[API_KEY_STORAGE_KEY];
        setApiKey(key || null);
      } catch (error) {
        console.error("Error checking API key:", error);
        setApiKey(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiKey();

    // Listen for changes to the API key in storage
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[API_KEY_STORAGE_KEY]) {
        const newValue = changes[API_KEY_STORAGE_KEY].newValue;
        setApiKey(newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return {
    apiKey,
    hasApiKey: !!apiKey,
    isLoading,
    isOfflineMode: !apiKey 
  };
};