export type Platform = 'wechat' | 'linkedin';

export type MessageType = 'holiday' | 'scheduling' | 'cold_outreach' | 'followup';

export type MessageStatus = 'draft' | 'approved' | 'sent';

export type CampaignStatus = 'draft' | 'generating' | 'review' | 'sending' | 'done';

export interface ParsedChat {
  contactName: string;
  platformId?: string;
  messages: {
    sender: 'me' | 'them';
    content: string;
    timestamp: Date;
  }[];
}

export interface ContactProfile {
  personality: string;
  interests: string[];
  communicationStyle: string;
  relationship: string;
  topics: string[];
  sentimentHistory: string;
  bestApproach: string;
}

export interface UserStyle {
  tone: string;
  formality: string;
  patterns: string[];
  greetings: string[];
  closings: string[];
  humor: boolean;
  emojiUsage: string;
  avgLength: string;
  languages: string[];
}

export interface GenerateMessageRequest {
  contactId: string;
  type: MessageType;
  metadata?: {
    holiday?: string;
    schedulingGoal?: string;
    outreachGoal?: string;
    customInstructions?: string;
  };
}
