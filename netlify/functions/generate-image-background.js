/**
 * SpotMe - Background Image Generation
 * Netlify Background Function - runs up to 15 minutes
 * Returns 202 immediately, processes in background
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

const GEMINI_MODEL = 'gemini-3-pro-image-preview';

// Billboard scene prompts
const scenePrompts = {
    nyc: `A photorealistic Times Square at night in New York City. Massive digital billboards everywhere with neon lights, crowds of people, yellow taxis. One prominent billboard displays: "{TEXT}". The billboard should look real and integrated into the scene. Cinematic lighting, 8K quality.`,
    tokyo: `A photorealistic Shibuya Crossing in Tokyo at night. Giant LED screens and billboards covering buildings, crowds crossing the street, neon signs everywhere. One large billboard prominently displays: "{TEXT}". Cyberpunk aesthetic, rain-wet streets reflecting lights.`,
    london: `A photorealistic Piccadilly Circus in London at night. Famous curved LED screens, red double-decker buses, crowds. One of the iconic digital billboards displays: "{TEXT}". Classic London atmosphere with modern digital advertising.`,
    highway: `A photorealistic American highway scene at sunset. A large roadside billboard on the side of the road displays: "{TEXT}". Open road, dramatic sky with orange and purple clouds, cars passing by. Cinematic wide shot.`,
    magazine: `A photorealistic high-end business magazine cover. Professional layout with "{TEXT}" as the cover headline. Sleek modern design, premium typography, glossy finish effect.`
};

exports.handler = async (event, context) => {
    console.log('=== generate-image-background STARTED ===');

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const body = JSON.parse(event.body || '{}');
        const { userImageUrl, text, scene, jobId, outputFilename } = body;

        console.log('Job:', jobId);
        console.log('Scene:', scene);
        console.log('Text:', text?.substring(0, 50));
        console.log('User image:', userImageUrl?.substring(0, 60));

        // Validation
        if (!text || !scene || !jobId || !outputFilename) {
            console.error('Missing parameters');
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing parameters' }) };
        }

        const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'spotme';
        const BUNNY_CDN_DOMAIN = process.env.BUNNY_CDN_DOMAIN || 'spotme.b-cdn.net';

        if (!GOOGLE_AI_API_KEY || !BUNNY_API_KEY) {
            console.error('Missing API keys');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API keys not configured' }) };
        }

        // Build prompt
        const basePrompt = scenePrompts[scene] || scenePrompts.nyc;
        const prompt = basePrompt.replace('{TEXT}', text);
        console.log('Prompt length:', prompt.length);

        // Build parts array
        const parts = [{ text: `Generate an image: ${prompt}` }];

        // Add user image if provided
        if (userImageUrl) {
            console.log('Fetching user image...');
            const imageResponse = await fetch(userImageUrl);
            if (imageResponse.ok) {
                const imageBuffer = await imageResponse.buffer();
                const imageBase64 = imageBuffer.toString('base64');
                const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

                parts.push({
                    inline_data: { mime_type: imageMimeType, data: imageBase64 }
                });
                console.log('User image added:', imageBuffer.length, 'bytes');
            } else {
                console.warn('Could not fetch user image:', imageResponse.status);
            }
        }

        // Call Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`;

        const requestBody = {
            contents: [{ parts }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                imageConfig: {
                    aspectRatio: "9:16",
                    imageSize: "2K"
                }
            }
        };

        console.log('Calling Gemini API...');
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseText = await geminiResponse.text();
        console.log('Gemini response status:', geminiResponse.status);

        if (!geminiResponse.ok) {
            console.error('Gemini API error:', responseText.substring(0, 500));
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Gemini API error' }) };
        }

        const geminiResult = JSON.parse(responseText);

        // Extract image
        let generatedImageBase64 = null;
        let generatedMimeType = 'image/jpeg';

        if (geminiResult.candidates?.[0]?.content?.parts) {
            for (const part of geminiResult.candidates[0].content.parts) {
                if (part.inlineData) {
                    generatedImageBase64 = part.inlineData.data;
                    generatedMimeType = part.inlineData.mimeType || 'image/jpeg';
                    break;
                }
            }
        }

        if (!generatedImageBase64) {
            console.error('No image in response');
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'No image generated' }) };
        }

        // Upload to Bunny
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${outputFilename}`;
        const imageBuffer = Buffer.from(generatedImageBase64, 'base64');

        console.log('Uploading to Bunny:', outputFilename);
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': generatedMimeType
            },
            body: imageBuffer
        });

        if (!uploadResponse.ok && uploadResponse.status !== 201) {
            console.error('Bunny upload failed:', uploadResponse.status);
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'Upload failed' }) };
        }

        const cdnUrl = `https://${BUNNY_CDN_DOMAIN}/${outputFilename}`;
        console.log('✅ SUCCESS! Image at:', cdnUrl);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, imageUrl: cdnUrl })
        };

    } catch (error) {
        console.error('Background function error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
