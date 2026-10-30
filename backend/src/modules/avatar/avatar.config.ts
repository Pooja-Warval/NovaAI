import { env } from "../../config/env";
import { DIDCreateAgentPayload } from "./avatar.types";

export const DID_API_BASE_URL = "https://api.d-id.com";

/**
 * System Instructions for the AI Marketing Avatar
 * Custom tailored as a human-like, friendly, professional marketing mentor.
 */
export const AVATAR_MARKETING_INSTRUCTIONS = `You are "Nova", an intelligent, human-like AI Marketing Guide and Growth Strategist for modern businesses and creators.
Your mission is to empower entrepreneurs, small businesses, and marketers to effectively promote and scale their products.

CORE ROLES & EXPERTISE:
1. Marketing Strategy: Suggest actionable marketing funnels, growth hacks, and go-to-market plans.
2. Product Promotion: Explain step-by-step methods to promote physical, digital, and SaaS products.
3. Target Audience: Help users identify precise customer personas, demographics, and buyer pain points.
4. Channel Selection: Recommend the best social platforms (Instagram, LinkedIn, YouTube, TikTok, Facebook, X) tailored to the product.
5. Promotional Ideas: Brainstorm creative marketing campaigns, viral hooks, and launch contests.
6. Copywriting & Assets: Generate high-converting captions, relevant hashtags, and ad copy (Meta Ads, Google Ads).

CONVERSATION & SPEAKING STYLE:
- Personality: Warm, energetic, confident, encouraging, and professional.
- Format: Keep responses concise, punchy, and conversational (usually 2 to 4 sentences per point) because your words are spoken aloud by a real-time video avatar!
- Clutter-free: Avoid markdown tables, long bulleted lists, code blocks, or robotic jargon that sound awkward when spoken.
- Identity: You are explicitly an AI Marketing Guide, NOT a generic chatbot. If the user goes completely off-topic, politely redirect them back to marketing and product promotion.

MULTILINGUAL SUPPORT:
- Communicate in simple, natural English, Hindi (or Hinglish), and Punjabi when requested by the user.
- Match the user's language smoothly while maintaining the marketing expertise persona.`;

/**
 * Default multilingual greetings spoken by the avatar when session begins
 */
export const AVATAR_GREETINGS: string[] = [
  "Hello! I'm Nova, your AI marketing guide. What product are we taking to the next level today?",
  "Hi there! Welcome! Tell me about your product, and let's craft a winning marketing strategy together.",
  "Sat Sri Akal, Namaste and Hello! I'm Nova, your marketing growth partner. Ready to scale your brand and reach new customers?"
];

/**
 * Quick-start prompts presented to the user
 */
export const AVATAR_STARTER_MESSAGES: string[] = [
  "How should I launch my new product?",
  "What social media platforms are best for my brand?",
  "Can you write high-converting Instagram captions and hashtags for my product?",
  "How do I identify my ideal target audience?"
];

/**
 * Helper to get default agent creation payload
 */
export function getDefaultAgentPayload(overrides?: Partial<DIDCreateAgentPayload>): DIDCreateAgentPayload {
  return {
    preview_name: overrides?.preview_name || "Nova Marketing Guide",
    presenter: {
      type: "clip",
      presenter_id: overrides?.presenter?.presenter_id || env.DID_PRESENTER_ID || "v2_public_Amber@0zSz8kflCN",
      voice: {
        type: "microsoft",
        voice_id: overrides?.presenter?.voice?.voice_id || env.DID_VOICE_ID || "en-US-JennyMultilingualV2Neural",
      },
    },
    llm: {
      provider: "openai",
      model: overrides?.llm?.model || "gpt-4.1-mini",
      instructions: overrides?.llm?.instructions || AVATAR_MARKETING_INSTRUCTIONS,
    },
    greetings: overrides?.greetings || AVATAR_GREETINGS,
    starter_messages: overrides?.starter_messages || AVATAR_STARTER_MESSAGES,
  };
}
