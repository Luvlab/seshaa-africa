import prisma from '../db';
import { Router } from 'express';

import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /ai/search — natural language directory search
router.post('/search', async (req, res) => {
  const { query, country, language = 'en' } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // Use Claude to parse the query and extract search intent
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: `You are a directory search assistant for Africa. Extract structured search parameters from user queries.
Return ONLY valid JSON with these fields: { "name": string|null, "city": string|null, "country": string|null, "category": string|null, "type": "PERSONAL"|"BUSINESS"|"GOVERNMENT"|"NGO"|null, "interpretation": string, "suggestions": string[] }
Category values: restaurant, health, education, finance, transport, hotel, tech, beauty, auto, agriculture, church, construction, legal, retail, ngo, government, other.
Type is BUSINESS unless clearly a person (PERSONAL), government office (GOVERNMENT), or NGO.
Keep interpretation in ${language} language, short and friendly.
suggestions: 3 related search queries the user might also want.`,
      messages: [{ role: 'user', content: `Search query: "${query}"\nUser country context: ${country || 'Africa'}` }],
    });

    const text = (response.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(text);

    // Build DB query from AI-extracted params
    const where: Record<string, unknown> = { active: true };
    if (parsed.country) where.country = { contains: parsed.country, mode: 'insensitive' };
    if (parsed.city) where.city = { contains: parsed.city, mode: 'insensitive' };
    if (parsed.category) where.category = { contains: parsed.category, mode: 'insensitive' };
    if (parsed.type) where.type = parsed.type;
    if (parsed.name) {
      where.OR = [
        { name: { contains: parsed.name, mode: 'insensitive' } },
        { description: { contains: parsed.name, mode: 'insensitive' } },
      ];
    }

    const listings = await prisma.listing.findMany({
      where,
      take: 20,
      orderBy: [{ verified: 'desc' }, { viewCount: 'desc' }],
      include: { tags: true },
    });

    res.json({
      query,
      interpretation: parsed.interpretation,
      listings,
      suggestions: parsed.suggestions || [],
    });
  } catch (err) {
    console.error('AI search error:', err);
    // Fallback to basic text search
    const listings = await prisma.listing.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      include: { tags: true },
    });
    res.json({ query, interpretation: query, listings, suggestions: [] });
  }
});

// POST /ai/chat — AI assistant chat (with directory context)
router.post('/chat', async (req, res) => {
  const { messages, context } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const systemPrompt = `You are a helpful assistant for an African directory and community app (like Yellow Pages + Google Maps + WhatsApp for Africa).
You help users find businesses, people, services and events across all 54 African countries.
You speak multiple languages including English, French, Portuguese, Arabic, Swahili, Hausa, Yoruba, Peul/Fulfulde, Amharic, Zulu, Igbo, Lingala, and Wolof.
Always respond in the same language the user writes in.
You can help with: finding listings, getting directions, sharing contacts, discovering local events, and using the platform.
Context: ${JSON.stringify(context || {})}`;

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

export default router;
