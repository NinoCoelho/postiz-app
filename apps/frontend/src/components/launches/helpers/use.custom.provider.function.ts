import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useCallback } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';

export const useCustomProviderFunction = () => {
  const fetch = useFetch();
  const toaster = useToaster();

  return useCallback(async (body: any, integrationId: string) => {
    try {
      const response = await fetch(`/integrations/article/${integrationId}`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Enhanced error logging
        console.error(`🚨 [PROVIDER ERROR] Custom provider failed:`, {
          integrationId,
          status: response.status,
          statusText: response.statusText,
          errorData,
          requestBody: body,
          timestamp: new Date().toISOString()
        });

        // Show user-friendly error message
        const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status >= 500) {
          toaster.showCritical(`Server Error: ${errorMessage}`);
        } else if (response.status === 429) {
          toaster.showError('Rate limit exceeded. Please wait before trying again.');
        } else if (response.status === 422) {
          toaster.showError(`Validation Error: ${errorMessage}`);
        } else if (response.status === 401 || response.status === 403) {
          toaster.showError('Authentication error. Please reconnect your account.');
        } else {
          toaster.showError(`Custom provider error: ${errorMessage}`);
        }
        
        throw new Error(`Custom provider request failed: ${errorMessage}`);
      }

      return await response.json();
    } catch (error: any) {
      // Network or other unexpected errors
      console.error(`🚨 [NETWORK ERROR] Custom provider network failure:`, {
        integrationId,
        error: error.message,
        name: error.name,
        stack: error.stack,
        requestBody: body,
        timestamp: new Date().toISOString()
      });

      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toaster.showCritical('Network error: Unable to connect to server');
      } else if (!error.message.includes('Custom provider request failed')) {
        toaster.showCritical(`Unexpected error: ${error.message}`);
      }
      
      throw error;
    }
  }, [fetch, toaster]);
};
