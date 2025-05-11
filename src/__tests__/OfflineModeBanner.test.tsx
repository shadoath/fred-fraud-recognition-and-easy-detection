import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { OfflineModeBanner } from '../components/OfflineModeBanner';
import { createTheme } from '@mui/material/styles';

describe('OfflineModeBanner', () => {
  const mockTheme = createTheme();
  const mockOnClick = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders correctly with default props', () => {
    render(<OfflineModeBanner theme={mockTheme} />);
    
    // Check if banner is rendered
    expect(screen.getByText(/offline mode active/i)).toBeInTheDocument();
    expect(screen.getByText(/offline pattern matching/i)).toBeInTheDocument();
    expect(screen.getByText(/add your api key/i)).toBeInTheDocument();
  });
  
  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    render(<OfflineModeBanner theme={mockTheme} onClick={mockOnClick} />);
    
    // Find and click the banner
    const banner = screen.getByRole('alert');
    await user.click(banner);
    
    // Verify onClick was called
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies hover styles on hover', async () => {
    const user = userEvent.setup();
    render(<OfflineModeBanner theme={mockTheme} onClick={mockOnClick} />);
    
    // Find the banner
    const banner = screen.getByRole('alert');
    
    // Check initial styles
    expect(banner).toHaveStyle('cursor: pointer');
    
    // Hover over the banner
    await user.hover(banner);
    
    // The actual hover style testing is limited in Jest DOM, 
    // but we can verify the element has the correct base styles
    expect(banner).toHaveStyle('cursor: pointer');
  });
  
  it('renders without onClick handler', () => {
    render(<OfflineModeBanner theme={mockTheme} />);
    
    // Find the banner
    const banner = screen.getByRole('alert');
    
    // Ensure it still renders properly
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/offline mode active/i)).toBeInTheDocument();
  });
});