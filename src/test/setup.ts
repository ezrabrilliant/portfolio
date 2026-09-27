import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockMatchMedia } from './match-media';

beforeEach(() => mockMatchMedia()); // default: nothing matches (no reduced motion, not phone)
afterEach(() => cleanup());
