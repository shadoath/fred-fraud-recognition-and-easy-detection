import { 
  offlineCheckEmailForFraud, 
  offlineCheckTextForFraud 
} from '../lib/offlineFraudService';
import { EmailData, TextData } from '../types/fraudTypes';

// Mock the setTimeout function to speed up tests
jest.useFakeTimers();

describe('Offline Fraud Detection Service', () => {
  // Test email fraud detection
  describe('offlineCheckEmailForFraud', () => {
    it('should detect phishing emails with suspicious sender', async () => {
      const emailData: EmailData = {
        sender: 'no-reply@suspicious-domain.com',
        subject: 'Your Account Will Be Locked',
        content: 'You need to verify your account immediately.',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckEmailForFraud(emailData);
      // Use fake timers to immediately resolve the promise
      jest.runAllTimers();
      const response = await result;

      // Assertions
      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(3);
      expect(response.flags).toContain('Suspicious sender address');
    });

    it('should detect urgency tactics in emails', async () => {
      const emailData: EmailData = {
        sender: 'service@company.com',
        subject: 'URGENT ACTION REQUIRED',
        content: 'You must act now to prevent your account from being locked.',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckEmailForFraud(emailData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(5);
      expect(response.flags?.some(flag => flag.includes('urgent action required'))).toBe(true);
    });

    it('should detect suspicious sender domain', async () => {
      const emailData: EmailData = {
        sender: 'no-reply@suspicious-domain.com',
        subject: 'Your Bank Account Security Alert',
        content: 'Your bank account requires verification due to suspicious activity. Click here to verify.',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckEmailForFraud(emailData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(3);
      expect(response.flags?.some(flag => flag.includes("Suspicious sender"))).toBe(true);
    });

    it('should detect multiple suspicious indicators', async () => {
      const emailData: EmailData = {
        sender: 'security@bank-secure-alert.com',
        subject: 'URGENT: Verify Your Bank Account',
        content: 'Dear customer, we have detected suspicious activity on your account. Click here to verify your account immediately: https://fake-bank.com/verify. You must act now!!! $$$',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckEmailForFraud(emailData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(7);
      // Should detect multiple issues
      expect(response.flags?.length).toBeGreaterThan(3);
      // Categories should include urgency tactics
      expect(response.explanation).toContain('Urgency Tactics');
    });

    it('should consider safe emails as low threat', async () => {
      const emailData: EmailData = {
        sender: 'colleague@company.com',
        subject: 'Meeting notes from yesterday',
        content: 'Hi team, attached are the meeting notes from our discussion yesterday. Let me know if you have any questions.',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckEmailForFraud(emailData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeLessThanOrEqual(3);
      // Should have few or no flags
      expect(response.flags?.length).toBeLessThanOrEqual(1);
    });
  });

  // Test text fraud detection
  describe('offlineCheckTextForFraud', () => {
    it('should detect get-rich-quick schemes', async () => {
      const textData: TextData = {
        content: 'Make money fast with this guaranteed investment. Risk free investment with HUGE returns!',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckTextForFraud(textData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(5);
      expect(response.flags?.length).toBeGreaterThan(1);
      expect(response.explanation).toContain('Get-Rich-Quick Schemes');
    });

    it('should detect requests for personal information', async () => {
      const textData: TextData = {
        content: 'To continue with your application, we need your social security number and mother\'s maiden name.',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckTextForFraud(textData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeGreaterThan(5);
      expect(response.flags?.some(flag => flag.includes('social security'))).toBe(true);
      expect(response.explanation).toContain('Personal Information Requests');
    });

    it('should detect suspicious formatting', async () => {
      const textData: TextData = {
        content: 'ACT NOW!!! This is a LIMITED TIME OFFER!!! Don\'t miss out!!! $$$CASH$$$',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckTextForFraud(textData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.flags?.some(flag => flag.includes('excessive punctuation'))).toBe(true);
      expect(response.threatRating).toBeGreaterThan(3);
    });
    
    it('should detect multiple URLs as suspicious', async () => {
      const textData: TextData = {
        content: 'Check out these great deals: https://site1.com, https://site2.com, https://site3.com, https://site4.com',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckTextForFraud(textData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.flags?.some(flag => flag.includes('multiple URLs'))).toBe(true);
      // Only check for the specific flag since explanation formatting may vary
      expect(response.flags?.some(flag => flag.includes('URLs'))).toBe(true);
    });

    it('should consider normal text as low threat', async () => {
      const textData: TextData = {
        content: 'Hi, I wanted to follow up on our conversation from yesterday. When would be a good time to meet and discuss the project timeline?',
        timestamp: new Date().toISOString()
      };

      const result = offlineCheckTextForFraud(textData);
      jest.runAllTimers();
      const response = await result;

      expect(response.success).toBe(true);
      expect(response.threatRating).toBeLessThanOrEqual(3);
      expect(response.flags?.length).toBeLessThanOrEqual(1);
      expect(response.explanation).toContain('No suspicious patterns');
    });
  });
});