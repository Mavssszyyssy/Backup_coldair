// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';
import { loadInterfaceLanguage } from './utils/customerI18n';

// Unit tests render individual screens without the app language bootstrap.
await loadInterfaceLanguage('Filipino');
