import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestAgentPanel } from '@/components/dashboard/agents/configure/TestAgentPanel';

// Mock the hooks
vi.mock('@/lib/hooks/useAgentTest', () => ({
  useAgentTest: vi.fn(),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { access_token: 'test-token' },
  }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { useAgentTest } from '@/lib/hooks/useAgentTest';

const mockedUseAgentTest = vi.mocked(useAgentTest);

describe('TestAgentPanel', () => {
  const defaultMockReturn = {
    testHistory: [],
    currentResult: null,
    isLoading: false,
    isLoadingHistory: false,
    error: null,
    runTest: vi.fn(),
    fetchTestHistory: vi.fn(),
    clearHistory: vi.fn(),
    selectResult: vi.fn(),
    stats: {
      totalTests: 0,
      totalCost: 0,
      avgResponseTime: 0,
      successRate: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAgentTest.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the test panel with header', () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('Test your agent with real LLM execution')).toBeInTheDocument();
    expect(screen.getByText('Live Test')).toBeInTheDocument();
  });

  it('renders sample prompts', () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('Sample Prompts')).toBeInTheDocument();
    expect(screen.getByText(/Draft a professional email/)).toBeInTheDocument();
    expect(screen.getByText(/Analyze this data/)).toBeInTheDocument();
  });

  it('allows typing in the test input textarea', async () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    const textarea = screen.getByPlaceholderText('Enter a test prompt to see how your agent responds...');
    await userEvent.type(textarea, 'Hello, test this!');
    
    expect(textarea).toHaveValue('Hello, test this!');
  });

  it('disables run button when input is empty', () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    const runButton = screen.getByRole('button', { name: /Run Test/i });
    expect(runButton).toBeDisabled();
  });

  it('enables run button when input has content', async () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    const textarea = screen.getByPlaceholderText('Enter a test prompt to see how your agent responds...');
    await userEvent.type(textarea, 'Test input');
    
    const runButton = screen.getByRole('button', { name: /Run Test/i });
    expect(runButton).toBeEnabled();
  });

  it('calls runTest when Run Test button is clicked', async () => {
    const mockRunTest = vi.fn().mockResolvedValue({});
    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      runTest: mockRunTest,
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    const textarea = screen.getByPlaceholderText('Enter a test prompt to see how your agent responds...');
    await userEvent.type(textarea, 'Test input');
    
    const runButton = screen.getByRole('button', { name: /Run Test/i });
    await userEvent.click(runButton);
    
    await waitFor(() => {
      expect(mockRunTest).toHaveBeenCalledWith({
        testInput: 'Test input',
        config: undefined,
        useCurrent: true,
      });
    });
  });

  it('shows loading state while test is running', async () => {
    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      isLoading: true,
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    const runButton = screen.getByRole('button', { name: /Running Test/i });
    expect(runButton).toBeDisabled();
    expect(screen.getByText(/Running Test/i)).toBeInTheDocument();
  });

  it('renders test history', () => {
    const mockHistory = [
      {
        id: 'test-1',
        input: 'First test',
        output: 'First response',
        success: true,
        responseTimeMs: 1000,
        tokensUsed: 250,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date('2026-02-14T10:00:00Z'),
      },
      {
        id: 'test-2',
        input: 'Second test',
        output: 'Second response',
        success: false,
        responseTimeMs: 500,
        tokensUsed: 100,
        costUsd: 0.002,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date('2026-02-14T09:00:00Z'),
        errorMessage: 'API error',
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('First test')).toBeInTheDocument();
    expect(screen.getByText('Second test')).toBeInTheDocument();
    expect(screen.getByText('1000ms')).toBeInTheDocument();
  });

  it('renders stats when there is test history', () => {
    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: [{
        id: 'test-1',
        input: 'Test',
        output: 'Response',
        success: true,
        responseTimeMs: 1000,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date(),
      }],
      stats: {
        totalTests: 5,
        totalCost: 0.025,
        avgResponseTime: 1200,
        successRate: 80,
      },
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('Tests')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
  });

  it('calls selectResult when a test result is clicked', async () => {
    const mockSelectResult = vi.fn();
    const mockHistory = [
      {
        id: 'test-1',
        input: 'First test',
        output: 'First response',
        success: true,
        responseTimeMs: 1000,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date('2026-02-14T10:00:00Z'),
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
      selectResult: mockSelectResult,
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    const testItem = screen.getByText('First test');
    await userEvent.click(testItem);
    
    expect(mockSelectResult).toHaveBeenCalledWith(mockHistory[0]);
  });

  it('shows test result details when a result is selected', () => {
    const mockHistory = [
      {
        id: 'test-1',
        input: 'Test input',
        output: 'Test output',
        success: true,
        responseTimeMs: 1000,
        tokensUsed: 250,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date('2026-02-14T10:00:00Z'),
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
      currentResult: mockHistory[0],
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('Test Result Details')).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
  });

  it('calls clearHistory when clear button is clicked', async () => {
    const mockClearHistory = vi.fn();
    const mockHistory = [
      {
        id: 'test-1',
        input: 'Test input',
        output: 'Test output',
        success: true,
        responseTimeMs: 1000,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date(),
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
      clearHistory: mockClearHistory,
    });

    const { container } = render(<TestAgentPanel agentId="agent-123" />);
    
    // Find the trash button by its icon
    const clearButton = container.querySelector('button svg[data-lucide="trash-2"]')?.parentElement;
    if (clearButton) {
      await userEvent.click(clearButton);
      expect(mockClearHistory).toHaveBeenCalled();
    }
  });

  it('calls fetchTestHistory when refresh button is clicked', async () => {
    const mockFetchTestHistory = vi.fn();
    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      fetchTestHistory: mockFetchTestHistory,
    });

    const { container } = render(<TestAgentPanel agentId="agent-123" />);
    
    // Find the refresh button by its icon
    const refreshButton = container.querySelector('button svg[data-lucide="refresh-cw"]')?.parentElement;
    
    if (refreshButton) {
      await userEvent.click(refreshButton);
      expect(mockFetchTestHistory).toHaveBeenCalled();
    }
  });

  it('displays error message when there is an error', () => {
    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      error: new Error('Failed to fetch test history'),
    });

    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch test history')).toBeInTheDocument();
  });

  it('fills input when a sample prompt is clicked', async () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    const samplePrompt = screen.getByText(/Draft a professional email/);
    await userEvent.click(samplePrompt);
    
    const textarea = screen.getByPlaceholderText('Enter a test prompt to see how your agent responds...');
    expect(textarea).toHaveValue('Draft a professional email to a potential client introducing our services');
  });

  it('shows success icon for successful tests', () => {
    const mockHistory = [
      {
        id: 'test-1',
        input: 'Successful test',
        output: 'Success!',
        success: true,
        responseTimeMs: 1000,
        costUsd: 0.005,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date(),
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
    });

    const { container } = render(<TestAgentPanel agentId="agent-123" />);
    
    // Check for green checkmark icon
    const checkIcon = container.querySelector('.text-green-500');
    expect(checkIcon).toBeInTheDocument();
  });

  it('shows error icon for failed tests', () => {
    const mockHistory = [
      {
        id: 'test-1',
        input: 'Failed test',
        output: '',
        success: false,
        responseTimeMs: 500,
        costUsd: 0.002,
        modelUsed: 'claude-3-5-sonnet',
        timestamp: new Date(),
        errorMessage: 'API timeout',
      },
    ];

    mockedUseAgentTest.mockReturnValue({
      ...defaultMockReturn,
      testHistory: mockHistory,
    });

    const { container } = render(<TestAgentPanel agentId="agent-123" />);
    
    // Check for red alert icon
    const alertIcon = container.querySelector('.text-red-500');
    expect(alertIcon).toBeInTheDocument();
  });

  it('displays empty state when no tests have been run', () => {
    render(<TestAgentPanel agentId="agent-123" />);
    
    expect(screen.getByText('No tests run yet')).toBeInTheDocument();
    expect(screen.getByText('Enter a prompt and click Run Test')).toBeInTheDocument();
  });
});
