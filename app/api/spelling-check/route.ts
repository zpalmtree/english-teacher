import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export const runtime = 'edge';

export async function POST(req: Request) {
    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
        return new Response(JSON.stringify({
            error: "Please provide some text to check."
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are a helpful American English 5th grade teacher that checks spelling and grammar for 5th-grade students. 
                Focus ONLY on significant errors such as:
                - Obvious spelling mistakes
                - Major grammatical errors
                - Clear punctuation mistakes
                
                DO NOT point out:
                - Minor formatting issues like extra spaces or newlines
                - Stylistic choices (e.g., using exclamation marks vs periods)
                
                Keep feedback encouraging and focused on helping the student improve their writing.
                Always provide a corrected version of the text, even if there are no errors.`
            },
            {
                role: 'user',
                content: `Please check the following text for major spelling and grammar errors: "${prompt}"`
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
                                            description: "The specific word or phrase containing the error"
                                        },
                                        correction: {
                                            type: "string",
                                            description: "The corrected word or phrase"
                                        },
                                        explanation: {
                                            type: "string",
                                            description: "A brief, encouraging explanation of why this needs correction"
                                        }
                                    },
                                    required: ["original", "correction", "explanation"]
                                }
                            },
                            feedback: {
                                type: "string",
                                description: "Brief, encouraging feedback about the writing. If no errors, praise the good writing."
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
    if (toolCall && toolCall.function.name === "provideCorrections" && toolCall.function.arguments) {
        return new Response(toolCall.function.arguments, {
            headers: { 'Content-Type': 'application/json' },
        });
    } else {
        return new Response(JSON.stringify({ error: "Unexpected response format" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
