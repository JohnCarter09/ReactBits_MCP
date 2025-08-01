// React Bits - UseTransition Hook
// Variant: js-css
// Original Path: src/hooks/useTransition.js
// Extracted from: https://github.com/pheralb/react-bits

import { useContext } from 'react';
import { TransitionContext } from '../components/context/TransitionContext/TransitionContext';

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};