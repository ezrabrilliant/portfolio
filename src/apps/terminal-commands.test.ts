import { describe, expect, it } from 'vitest';
import { config } from '@/config/portfolio';
import { runCommand } from './terminal-commands';

describe('runCommand', () => {
  it('help lists every command and the window shortcuts', () => {
    const { output } = runCommand('help');
    for (const c of ['help', 'whoami', 'projects', 'contact', 'clear']) expect(output).toContain(c);
    expect(output).toContain('ctrl+`');
    expect(output).toContain('Esc');
  });

  it('whoami answers with who runs this machine', () => {
    const { output } = runCommand('whoami');
    expect(output).toContain('Ezra Brilliant');
    expect(output).toContain('Surabaya');
    // degree comes from config.education verbatim, never retyped
    const petra = config.education.find((e) => e.institution === 'Petra Christian University')!;
    expect(output).toContain(`${petra.degree}, ${petra.institution}`);
  });

  it('projects prints the five systems with metric and status columns', () => {
    const { output } = runCommand('projects');
    const lines = output.split('\n');
    expect(lines).toHaveLength(5);
    expect(lines[0]).toMatch(/^orbit-store\s+2,700\+ orders\s+shipped$/);
  });

  it('contact prints email, github and linkedin', () => {
    const { output } = runCommand('contact');
    expect(output).toContain('ezrakonterliem@gmail.com');
    expect(output).toContain('github.com/ezrabrilliant');
    expect(output).toContain('linkedin.com/in/ezrabrilliant');
  });

  it('clear signals the screen wipe', () => {
    expect(runCommand('clear')).toEqual({ output: '', clear: true });
  });

  it('trims and lowercases input before matching', () => {
    // Review Focus #3: "  HELP  " must run, not fail
    expect(runCommand('  HELP  ').output).toContain('whoami');
    expect(runCommand('CLEAR').clear).toBe(true);
  });

  it('unknown command names the word and points at help', () => {
    expect(runCommand('sudo rm -rf /').output).toBe('sudo: command not found — try help');
  });

  it('empty input produces empty output', () => {
    expect(runCommand('   ').output).toBe('');
  });

  it('prototype keys are unknown commands, not Object members', () => {
    expect(runCommand('constructor').output).toBe('constructor: command not found — try help');
    expect(runCommand('toString').output).toBe('tostring: command not found — try help');
  });
});
