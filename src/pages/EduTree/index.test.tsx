import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import EduTree from './index';

describe('EduTree page storage resilience', () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
  });

  afterEach(() => {
    cleanup();
    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor);
    } else {
      delete (window as Window & { localStorage?: Storage }).localStorage;
    }
    vi.unstubAllEnvs();
  });

  it('renders when localStorage is unavailable', () => {
    vi.stubEnv('VITE_EDU_TREE_ENABLED', 'false');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
      writable: true,
    });

    expect(() => render(<EduTree />)).not.toThrow();
    expect(
      screen.getByText('Education-First Skill Tree')
    ).toBeInTheDocument();
  });
});