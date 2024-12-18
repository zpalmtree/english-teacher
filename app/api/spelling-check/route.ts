/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
});

type CorrectionResult = {
    hasErrors: boolean;
    correctedText: string;
    errors: Array<{
        original: string;
        correction: string;
        type: 'spelling' | 'grammar' | 'punctuation' | 'paragraph';
        explanation: string;
    }>;
    feedback: string;
};

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a helpful American English 5th grade teacher that checks spelling, grammar, and paragraph structure for 5th-grade students. 

Focus on these significant errors:
- Obvious spelling mistakes
- Major grammatical errors
- Clear punctuation mistakes
- Paragraph structure (VERY IMPORTANT)
- Missing question marks
- Unquoted spoken dialogue

For paragraphs specifically:
- Before marking any paragraph error, check if there is ANY kind of paragraph break present (including multiple newlines)
- If there is ANY visual separation between paragraphs in the original text, DO NOT include it as an error
- Only flag completely missing paragraph breaks where ideas run together without any separation
- There should be a new paragraph when a new speaker / different speaker talks
- When checking for paragraph breaks:
  1. First look for any kind of visual separation between ideas (newlines, multiple newlines, etc.)
  2. If ANY separation exists, do not include it in the errors list
  3. Only proceed to mark a paragraph error if the ideas are completely run together with no separation
- In the correctedText:
  - Normalize all existing paragraph breaks to exactly two newlines
  - Add new paragraph breaks only where they were completely missing
- For context: The example "According to monoda tarisim feels like fear of the unone because she does not no what will happin next on paj\n\n\nHow can family relationships and damnit inflo is a prison akshins" should NOT generate a paragraph error because there is already a break present

DO NOT point out:
- Minor formatting issues like extra spaces or newlines
- Stylistic choices (e.g., using exclamation marks vs periods)
- Existing paragraph breaks regardless of their formatting
- Any kind of spacing or newline normalization as errors

DO:
- Fix the corrected text to be perfect, even if we are not reporting these errors (e.g. 3 newlines -> 2 newlines for paragraphs)
- Always explain why a correction is needed
- Ensure the capitalization on corrections is correct
- Explain when quotations are needed

* Make sure the correctedText includes normalized paragraph breaks (two newlines) where needed
* Note that some words may be incorrectly spelt phonetically - try to identify these where possible, e.g. "tarisim" -> terrorism, "damnit inflo" -> "dynamics influence"
* Do not remove whitespace or newlines when displaying the "original" text in the correction
* Spelling errors should be addressed one by one, not combined into a single correction - unless it is a 'phrase' that all belongs together
* If the topic is inappropriate for this age group (sexual, graphically violent, etc), explain this in the correctedText and do not correct any of the users input

Keep feedback encouraging and focused on helping the student improve their writing.
Always provide a corrected version of the text, even if there are no errors.`;

async function checkWithOpenAI(prompt: string): Promise<CorrectionResult> {
    console.log(prompt);

    const withNewlines = prompt.replace(/\n/g, '\\n');

    const response = await openai.chat.completions.create({
        temperature: 0.01,
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: `Please check the following text: "${withNewlines}"`
            }
        ],
        tools: [
            {
                type: "function",
                function: {
                    name: "provideCorrections",
                    description: "Provide corrections and explanations for significant errors in the text",
                    parameters: {
                        type: "object",
                        properties: {
                            hasErrors: {
                                type: "boolean",
                                description: "Indicates whether the text contains any significant errors"
                            },
                            correctedText: {
                                type: "string",
                                description: "The full text with all corrections applied. If no errors, this should be identical to the original text."
                            },
                            errors: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        original: {
                                            type: "string",
                                            description: "The specific text segment containing the error"
                                        },
                                        correction: {
                                            type: "string",
                                            description: "The corrected version"
                                        },
                                        type: {
                                            type: "string",
                                            enum: ["spelling", "grammar", "punctuation", "paragraph"],
                                            description: "The type of error being corrected"
                                        },
                                        explanation: {
                                            type: "string",
                                            description: "A brief, encouraging explanation of why this needs correction"
                                        }
                                    },
                                    required: ["original", "correction", "type", "explanation"]
                                }
                            },
                            feedback: {
                                type: "string",
                                description: "Brief, encouraging feedback about the writing"
                            }
                        },
                        required: ["hasErrors", "correctedText", "errors", "feedback"]
                    }
                }
            }
        ],
        tool_choice: {
            type: "function",
            function: { name: "provideCorrections" }
        }
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall?.function.arguments) {
        throw new Error("Unexpected response format from OpenAI");
    }

    try {
        console.log(toolCall.function.arguments);
        return JSON.parse(toolCall.function.arguments);
    } catch (e: any) {
        throw new Error(`Failed to parse OpenAI response: ${e.message}`);
    }
}

async function checkWithClaude(prompt: string): Promise<CorrectionResult> {
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key is not configured");
    }

    // Sanitize the prompt
    const sanitizedPrompt = prompt.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}

        Analyze the text and respond with a JSON object in this exact format:
        {
            "hasErrors": boolean,
            "correctedText": "full text with corrections",
            "errors": [
                {
                    "original": "text with error",
                    "correction": "corrected text",
                    "type": "spelling|grammar|punctuation|paragraph",
                    "explanation": "encouraging explanation"
                }
            ],
            "feedback": "encouraging overall feedback"
        }

        Focus on significant errors only. Ensure the response is valid JSON.`,
        messages: [
            {
                role: 'user',
                content: `Please check the following text: "${sanitizedPrompt}"`
            }
        ]
    });

    // Get the first content block
    const content = response.content[0];
    if (!content || content.type !== 'text') {
        throw new Error("Unexpected response format from Claude");
    }

    try {
        return JSON.parse(content.text);
    } catch (e: any) {
        throw new Error(`Failed to parse Claude response: ${e.message}`);
    }
}

export async function POST(req: Request) {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
        return new Response(JSON.stringify({
            error: "Please provide some text to check."
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Try OpenAI first, fall back to Claude if it fails
    try {
        const result = await checkWithOpenAI(prompt);
        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('OpenAI request failed:', error);
        
        try {
            const result = await checkWithClaude(prompt);
            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (claudeError: any) {
            console.error('Claude request failed:', claudeError);
            
            // More specific error message based on the type of error
            const errorMessage = claudeError.message.includes('API key') 
                ? "Claude service is not properly configured."
                : "Both grammar checking services are currently unavailable.";
                
            return new Response(JSON.stringify({
                error: errorMessage
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}
