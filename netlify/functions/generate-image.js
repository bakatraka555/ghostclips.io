/**
 * Generate Image using Google AI (Imagen 3)
 * Adapted from Raincrest project
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    console.log('=== generate-image function called ===');

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, style } = body;

        if (!prompt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing prompt' })
            };
        }

        // Check for API key
        const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
        if (!GOOGLE_AI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'GOOGLE_AI_API_KEY not configured',
                    hint: 'Add GOOGLE_AI_API_KEY in Netlify Environment Variables'
                })
            };
        }

        // Enhance prompt for brainrot style
        const enhancedPrompt = `${prompt}. Style: Highly detailed, viral social media aesthetic, dramatic lighting, 4K quality, trending on social media. ${style || ''}`;

        console.log('Generating image with prompt:', enhancedPrompt.substring(0, 100) + '...');

        // Call Google AI (Gemini with image generation)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Generate an image: ${enhancedPrompt}` }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google AI error:', errorText);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Google AI generation failed',
                    details: errorText
                })
            };
        }

        const result = await response.json();

        // Extract image data
        let imageData = null;
        if (result.candidates && result.candidates[0]?.content?.parts) {
            for (const part of result.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageData = part.inlineData.data;
                    break;
                }
            }
        }

        if (!imageData) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'No image generated',
                    result: result
                })
            };
        }

        // Upload to Bunny.net
        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'nano-banana';
        const BUNNY_CDN_DOMAIN = process.env.BUNNY_CDN_DOMAIN || 'nano-banana.b-cdn.net';

        if (!BUNNY_API_KEY) {
            // Return base64 if no Bunny configured
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    imageData: `data:image/jpeg;base64,${imageData}`,
                    source: 'base64'
                })
            };
        }

        // Upload to Bunny
        const filename = `generated/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;

        const imageBuffer = Buffer.from(imageData, 'base64');

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'image/jpeg'
            },
            body: imageBuffer
        });

        if (!uploadResponse.ok) {
            console.error('Bunny upload failed');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    imageData: `data:image/jpeg;base64,${imageData}`,
                    source: 'base64-fallback'
                })
            };
        }

        const imageUrl = `https://${BUNNY_CDN_DOMAIN}/${filename}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                imageUrl: imageUrl,
                source: 'bunny-cdn'
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
