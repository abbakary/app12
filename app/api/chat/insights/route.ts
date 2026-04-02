import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChartContext {
  topItems: string[];
  categoryRevenue: string[];
  totalCustomers: number;
  todaySales: number;
  todayOrders: number;
  topCustomers: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { message, context, conversationHistory } = await request.json();

    if (!message || !context) {
      return NextResponse.json(
        { error: 'Message and context are required' },
        { status: 400 }
      );
    }

    // Build system prompt with chart context
    const systemPrompt = `You are a helpful sales analytics assistant for a restaurant management system. You have access to real-time sales and customer data.

CURRENT SALES DATA:
- Today's Sales: TSH ${context.todaySales.toLocaleString()}
- Today's Orders: ${context.todayOrders}
- Total Registered Customers: ${context.totalCustomers}

TOP SELLING ITEMS:
${context.topItems.join('\n')}

REVENUE BY CATEGORY:
${context.categoryRevenue.join('\n')}

TOP CUSTOMERS:
${context.topCustomers.join('\n')}

You provide insightful analysis about menu performance, customer behavior, and revenue trends. Keep responses concise and actionable. Use the Tanzanian Shilling (TSH) for all currency amounts.`;

    // Prepare messages for OpenAI
    const messages: Message[] = [
      ...(conversationHistory || []),
      { role: 'user', content: message },
    ];

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from OpenAI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    return NextResponse.json({
      response: assistantMessage,
      model: OPENAI_MODEL,
    });
  } catch (error) {
    console.error('Error in insights chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
