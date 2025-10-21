import { useState, useCallback } from 'react';

/**
 * Custom hook for managing popup/dialog state with proper error handling
 * Ensures popups can be reopened after API errors
 */
export const usePopupState = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const openPopup = useCallback(() => {
    setIsOpen(true);
    setError(null);
    setIsLoading(false);
  }, []);

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setIsLoading(false);
  }, []);

  const setLoading = useCallback((loading) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
    }
  }, []);

  const setErrorState = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const resetState = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isOpen,
    isLoading,
    error,
    openPopup,
    closePopup,
    setLoading,
    setErrorState,
    resetState
  };
};

/**
 * Custom hook for managing form submission with popup state
 * Handles loading states and error recovery properly
 */
export const useFormSubmission = (popupState) => {
  const { setLoading, setErrorState, closePopup } = popupState;

  const submitForm = useCallback(async (submitFunction, onSuccess) => {
    try {
      setLoading(true);
      await submitFunction();
      
      if (onSuccess) {
        onSuccess();
      }
      
      closePopup();
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setErrorState(errorMessage);
      
      // Don't close popup on error - let user retry or fix the issue
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setErrorState, closePopup]);

  return { submitForm };
};

export default usePopupState;
