/**
 * SpotMe - Create Upload Token
 * Returns temporary credentials for direct Bunny CDN upload
 */

const crypto = require('crypto');

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
        const { filename } = body;

        if (!filename) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing filename' })
            };
        }

        const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
        const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE || 'spotme';
        const BUNNY_CDN_DOMAIN = process.env.BUNNY_CDN_DOMAIN || 'spotme.b-cdn.net';

        if (!BUNNY_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'BUNNY_API_KEY not configured' })
            };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(4).toString('hex');
        const safeFilename = `temp/${timestamp}-${randomId}-${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        // Upload URL
        const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${safeFilename}`;
        const cdnUrl = `https://${BUNNY_CDN_DOMAIN}/${safeFilename}`;

        // Token expires in 5 minutes
        const expiresAt = Date.now() + (5 * 60 * 1000);

        console.log('Upload token created:', { safeFilename, expiresAt: new Date(expiresAt) });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                uploadUrl: uploadUrl,
                cdnUrl: cdnUrl,
                apiKey: BUNNY_API_KEY, // Client needs this for direct upload
                expiresAt: expiresAt,
                filename: safeFilename
            })
        };

    } catch (error) {
        console.error('Error creating upload token:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};
