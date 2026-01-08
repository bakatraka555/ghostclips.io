/**
 * Generate TTS Audio using Google Cloud Text-to-Speech
 */

const fetch = require('node-fetch');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    console.log('=== generate-tts function called ===');

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { text, voice } = body;

        if (!text) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing text' })
            };
        }

        const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
        if (!GOOGLE_AI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'GOOGLE_AI_API_KEY not configured' })
            };
        }

        // Voice options
        const voiceConfig = {
            languageCode: 'en-US',
            name: voice || 'en-US-Neural2-J', // Default: Male dramatic
            ssmlGender: 'MALE'
        };

        // Call Google TTS API
        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_AI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: text },
                    voice: voiceConfig,
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 0.9,  // Slightly slower for drama
                        pitch: -2.0        // Lower pitch for intensity
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('TTS error:', errorText);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'TTS generation failed', details: errorText })
            };
        }

        const result = await response.json();
        const audioData = result.audioContent;

        if (!audioData) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'No audio generated' })
            };
        }

        // Upload to Bunny if configured
        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'nano-banana';
        const BUNNY_CDN_DOMAIN = process.env.BUNNY_CDN_DOMAIN || 'nano-banana.b-cdn.net';

        if (!BUNNY_API_KEY) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    audioData: `data:audio/mp3;base64,${audioData}`,
                    source: 'base64'
                })
            };
        }

        // Upload to Bunny
        const filename = `audio/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.mp3`;
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${filename}`;

        const audioBuffer = Buffer.from(audioData, 'base64');

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'audio/mpeg'
            },
            body: audioBuffer
        });

        if (!uploadResponse.ok) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    audioData: `data:audio/mp3;base64,${audioData}`,
                    source: 'base64-fallback'
                })
            };
        }

        const audioUrl = `https://${BUNNY_CDN_DOMAIN}/${filename}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                audioUrl: audioUrl,
                source: 'bunny-cdn'
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
