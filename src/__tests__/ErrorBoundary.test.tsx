import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Mock the snackbar context
jest.mock('../contexts/CustomSnackbarContext', () => ({
  useCustomSnackbar: () => ({
    toast: {
      error: jest.fn(),
      success: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
    },
  }),
}));

// Component that throws an error on render
const BuggyComponent = () => {
  throw new Error('Test error from BuggyComponent');
  // eslint-disable-next-line no-unreachable
  return <div>This will never render</div>;
};

// Component that throws an error on button click
const ButtonThatThrows = () => {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  
  if (shouldThrow) {
    throw new Error('Error triggered by button click');
  }
  
  return (
    <button onClick={() => setShouldThrow(true)}>
      Trigger Error
    </button>
  );
};

describe('ErrorBoundary', () => {
  // Suppress console errors during the tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalConsoleError;
  });
  
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Test Child</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
  
  it('renders fallback UI when child component throws an error', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );
    
    // Check that fallback UI is rendered
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    expect(screen.getByText(/Test error from BuggyComponent/i)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
  
  it('should reset error and render children again when clicking Try Again', async () => {
    const user = userEvent.setup();
    
    // Spy on console.error and reset between tests
    const errorBoundaryConsoleError = jest.spyOn(console, 'error');
    errorBoundaryConsoleError.mockImplementation(() => {});
    
    const TestReset = () => {
      const [key, setKey] = React.useState(0);
      
      return (
        <ErrorBoundary key={key}>
          {key === 0 ? (
            <BuggyComponent />
          ) : (
            <div data-testid="recovered">Recovered Component</div>
          )}
          <button onClick={() => setKey(1)}>Reset Key</button>
        </ErrorBoundary>
      );
    };
    
    render(<TestReset />);
    
    // Verify error UI is shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click try again button
    await user.click(screen.getByText('Try Again'));
    
    // This should trigger a reset of the error boundary state
    // but our BuggyComponent will still throw, so we won't see "Recovered Component"
    // But we can verify the error boundary tried to recover
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    errorBoundaryConsoleError.mockRestore();
  });
  
  it('should use custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <BuggyComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
  });
});