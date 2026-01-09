/**
 * SpotMe Billboard Generator
 * Uses Google Gemini 3 Pro Image Preview
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

        // Call Google AI (Gemini Image Model)
        const GEMINI_MODEL = 'gemini-3-pro-image-preview';
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Generate an image: ${enhancedPrompt}` }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE"],
                        imageConfig: {
                            aspectRatio: "9:16",
                            imageSize: "2K"
                        }
                    }
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
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'spotme';
        const BUNNY_CDN_DOMAIN = process.env.BUNNY_CDN_DOMAIN || 'spotme.b-cdn.net';

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
        const filename = `spotme/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;
        const imageBuffer = Buffer.from(imageData, 'base64');

        console.log('Bunny config:', { zone: BUNNY_STORAGE_ZONE, cdn: BUNNY_CDN_DOMAIN });
        console.log('Upload URL:', uploadUrl);
        console.log('Image buffer size:', imageBuffer.length, 'bytes');

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'image/jpeg'
            },
            body: imageBuffer
        });

        console.log('Bunny response status:', uploadResponse.status);

        if (!uploadResponse.ok && uploadResponse.status !== 201) {
            const errorText = await uploadResponse.text();
            console.error('Bunny upload failed:', uploadResponse.status, errorText);
            console.log('Returning base64 fallback, imageData length:', imageData.length);
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
        console.log('SUCCESS! CDN URL:', imageUrl);

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
