import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('labels data as synthetic in mock mode', () => {
    render(<App />);
    expect(screen.getByTestId('data-source')).toHaveAttribute('data-mode', 'mock');
  });

  it('switches to Arabic and RTL', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'العربية' }));
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('نظرة عامة على الجودة');
  });

  it('applies an explicit dark theme', async () => {
    render(<App />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
