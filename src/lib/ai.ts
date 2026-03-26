import { execFile } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

function claudePrompt(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Write prompt to a temp file to avoid shell escaping issues with large prompts
    const tmpFile = join(tmpdir(), `nexus-${randomBytes(6).toString('hex')}.txt`);
    writeFileSync(tmpFile, prompt, 'utf-8');

    execFile(
      'claude',
      ['-p', '--model', 'sonnet'],
      { maxBuffer: 1024 * 1024, timeout: 120_000, env: { ...process.env, PATH: process.env.PATH + ':/usr/local/bin:/Users/ericzhang/.local/bin' } },
      (err, stdout, stderr) => {
        try { unlinkSync(tmpFile); } catch {}
        if (err) {
          reject(new Error(`claude CLI error: ${stderr || err.message}`));
        } else {
          resolve(stdout.trim());
        }
      }
    ).stdin?.end(prompt);
  });
}

export async function analyzeContactProfile(
  contactName: string,
  messages: { sender: string; content: string; timestamp: Date }[],
  background?: string
): Promise<string> {
  const chatLog = messages
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(m => `[${m.timestamp.toISOString().split('T')[0]}] ${m.sender === 'me' ? 'Me' : contactName}: ${m.content}`)
    .join('\n');

  return claudePrompt(`Analyze this person based on our chat history and generate a networking profile.

Person: ${contactName}
${background ? `Background: ${background}` : ''}

Chat history:
${chatLog}

Return a JSON object with these fields:
- personality: Brief personality description
- interests: Array of their interests/topics they care about
- communicationStyle: How they communicate (formal, casual, emoji-heavy, etc.)
- relationship: Our relationship dynamic (close friend, professional acquaintance, etc.)
- topics: Array of topics we commonly discuss
- sentimentHistory: Overall sentiment trend of our conversations
- bestApproach: Best way to reach out to them

Return ONLY valid JSON, no markdown.`);
}

export async function analyzeMyStyle(
  myMessages: { content: string; timestamp: Date }[]
): Promise<string> {
  const samples = myMessages
    .slice(-100)
    .map(m => m.content)
    .join('\n---\n');

  return claudePrompt(`Analyze my writing/messaging style from these message samples and create a style profile that can be used to generate messages that sound like me.

My messages:
${samples}

Return a JSON object with:
- tone: Overall tone (warm, professional, witty, etc.)
- formality: Formality level
- patterns: Array of recurring patterns/phrases I use
- greetings: Array of greetings I commonly use
- closings: Array of closings/sign-offs I use
- humor: Boolean - do I use humor?
- emojiUsage: How I use emojis (none, light, heavy)
- avgLength: Average message length (short/medium/long)
- languages: Array of languages I use

Return ONLY valid JSON, no markdown.`);
}

export async function generateMessage(params: {
  type: 'holiday' | 'scheduling' | 'cold_outreach' | 'followup';
  contactProfile: string;
  userStyle: string;
  contactName: string;
  metadata?: {
    holiday?: string;
    schedulingGoal?: string;
    outreachGoal?: string;
    customInstructions?: string;
  };
}): Promise<string> {
  const { type, contactProfile, userStyle, contactName, metadata } = params;

  const typePrompts: Record<string, string> = {
    holiday: `Write a ${metadata?.holiday || 'holiday'} greeting message for ${contactName}. Make it warm, personal, and reference specific things from our relationship/shared interests. It should feel genuine and individualized, NOT generic.`,

    scheduling: `Write a message to ${contactName} to schedule a ${metadata?.schedulingGoal || 'call or coffee chat'}. Make it natural, reference something relevant from our history or their recent work, and make it easy for them to say yes. Include a soft ask, not pushy.`,

    cold_outreach: `Write a cold outreach message to ${contactName}. Goal: ${metadata?.outreachGoal || 'establish connection and get a response'}.
This message MUST:
- Feel personal, not templated
- Reference something specific about them that shows genuine interest
- Create an emotional connection or curiosity
- Be concise but compelling
- End with a low-friction ask
- Pull at heartstrings if appropriate — make them WANT to respond`,

    followup: `Write a follow-up message to ${contactName}. Keep it brief, add value (share something relevant to them), and gently re-engage without being pushy.`,
  };

  return claudePrompt(`You are ghostwriting a networking message for me. Write it in MY voice and style.

MY WRITING STYLE:
${userStyle}

RECIPIENT PROFILE:
${contactProfile}

TASK:
${typePrompts[type]}

${metadata?.customInstructions ? `ADDITIONAL INSTRUCTIONS: ${metadata.customInstructions}` : ''}

Write ONLY the message text. No subject line, no explanation, no quotes. Just the message as I would send it.`);
}

export async function generateBatchMessages(params: {
  type: 'holiday' | 'scheduling' | 'cold_outreach' | 'followup';
  contacts: { id: string; name: string; profile: string }[];
  userStyle: string;
  metadata?: {
    holiday?: string;
    schedulingGoal?: string;
    outreachGoal?: string;
    customInstructions?: string;
  };
}): Promise<{ contactId: string; message: string }[]> {
  // Process in batches of 3 to avoid overwhelming the CLI
  const batchSize = 3;
  const results: { contactId: string; message: string }[] = [];

  for (let i = 0; i < params.contacts.length; i += batchSize) {
    const batch = params.contacts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (contact) => {
        const message = await generateMessage({
          type: params.type,
          contactProfile: contact.profile,
          userStyle: params.userStyle,
          contactName: contact.name,
          metadata: params.metadata,
        });
        return { contactId: contact.id, message };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

export async function tweakMessage(currentMessage: string, instruction: string): Promise<string> {
  return claudePrompt(`You are editing a networking message. Apply the user's instruction to refine it.

CURRENT MESSAGE:
${currentMessage}

INSTRUCTION:
${instruction}

Write ONLY the updated message text. No explanation, no quotes, no markdown. Just the message.`);
}
