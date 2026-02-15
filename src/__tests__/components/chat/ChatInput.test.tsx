/**
 * ChatInput Component Tests
 * Issue: #48 - Chat Interface
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '@/components/chat/ChatInput';

describe('ChatInput', () => {
  const defaultProps = {
    onSend: vi.fn(),
    disabled: false,
    placeholder: 'Type a message...',
    maxLength: 4000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('displays custom placeholder', () => {
    render(<ChatInput {...defaultProps} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onSend when clicking send button', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello world');
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith('Hello world');
  });

  it('calls onSend when pressing Enter', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello world');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(onSend).toHaveBeenCalledWith('Hello world');
  });

  it('does not send on Shift+Enter', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Line 1');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears input after sending', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    await userEvent.type(input, 'Hello world');
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(input.value).toBe('');
  });

  it('disables input when disabled prop is true', () => {
    render(<ChatInput {...defaultProps} disabled={true} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    expect(input).toBeDisabled();
    
    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('does not send empty messages', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, '   ');
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('displays character count', async () => {
    render(<ChatInput {...defaultProps} maxLength={100} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello');
    
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('enforces max length', async () => {
    render(<ChatInput {...defaultProps} maxLength={10} />);
    
    const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    
    // Type more than max length
    await userEvent.type(input, 'This is a very long message');
    
    // Input should be truncated or not accept more characters
    expect(input.value.length).toBeLessThanOrEqual(10);
  });

  it('shows warning when near character limit', async () => {
    render(<ChatInput {...defaultProps} maxLength={100} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'a'.repeat(95));
    
    const charCount = screen.getByText('95/100');
    expect(charCount).toHaveClass('text-amber-500');
  });

  it('displays hint text', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
  });

  it('auto-resizes textarea', async () => {
    render(<ChatInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...') as HTMLTextAreaElement;
    const initialHeight = input.style.height;
    
    // Type multiple lines
    await userEvent.type(input, 'Line 1\nLine 2\nLine 3\nLine 4');
    
    // Height should have changed
    expect(input.style.height).not.toBe(initialHeight);
  });

  it('shows loading spinner when sending', () => {
    render(<ChatInput {...defaultProps} disabled={true} />);
    
    const sendButton = screen.getByRole('button');
    expect(sendButton.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('is accessible with keyboard', async () => {
    render(<ChatInput {...defaultProps} />);

    const input = screen.getByPlaceholderText('Type a message...');

    // Should be focusable
    input.focus();
    expect(document.activeElement).toBe(input);

    // Type content so the send button becomes enabled (disabled buttons cannot receive focus)
    await userEvent.type(input, 'Hello');

    // Send button should be focusable
    const sendButton = screen.getByRole('button');
    sendButton.focus();
    expect(document.activeElement).toBe(sendButton);
  });

  it('trims message before sending', async () => {
    const onSend = vi.fn();
    render(<ChatInput {...defaultProps} onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, '  Hello world  ');
    
    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith('Hello world');
  });
});
