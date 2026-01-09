/**
 * SpotMe - SafeSearch Content Moderation
 * Uses Google Cloud Vision API to check for inappropriate content
 */

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
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
        const body = JSON.parse(event.body || '{}');
        const { imageUrl } = body;

        if (!imageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing imageUrl' })
            };
        }

        const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

        if (!GOOGLE_AI_API_KEY) {
            // If no API key, skip SafeSearch (allow all)
            console.log('No GOOGLE_AI_API_KEY, skipping SafeSearch');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ safe: true, skipped: true })
            };
        }

        // Call Vision API SafeSearch
        const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_AI_API_KEY}`;

        const response = await fetch(visionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: {
                        source: { imageUri: imageUrl }
                    },
                    features: [{
                        type: 'SAFE_SEARCH_DETECTION'
                    }]
                }]
            })
        });

        if (!response.ok) {
            console.error('Vision API error:', await response.text());
            // On error, allow (fail open)
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ safe: true, error: 'Vision API error' })
            };
        }

        const result = await response.json();
        const safeSearch = result.responses?.[0]?.safeSearchAnnotation;

        if (!safeSearch) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ safe: true, noData: true })
            };
        }

        // Check categories - block if LIKELY or VERY_LIKELY
        const blocked = ['LIKELY', 'VERY_LIKELY'];
        const isUnsafe =
            blocked.includes(safeSearch.adult) ||
            blocked.includes(safeSearch.violence) ||
            blocked.includes(safeSearch.racy);

        console.log('SafeSearch result:', safeSearch, 'isUnsafe:', isUnsafe);

        if (isUnsafe) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    safe: false,
                    reason: 'Image contains inappropriate content',
                    details: safeSearch
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ safe: true, details: safeSearch })
        };

    } catch (error) {
        console.error('SafeSearch error:', error);
        // Fail open - allow on error
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ safe: true, error: error.message })
        };
    }
};
