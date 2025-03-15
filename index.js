require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const session = require('express-session');
const querystring = require('querystring');

const app = express();
const port = 3000;

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, WHOOP_API_HOSTNAME } = process.env;

app.use(session({
    secret: CLIENT_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' }
}));

app.get('/auth', (req, res) => {
    const state = crypto.randomBytes(8).toString('hex');
    req.session.state = state;
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.status(500).send('Internal Server Error');
        }
        const authUrl = `${WHOOP_API_HOSTNAME}/oauth/oauth2/auth?` +
            `client_id=${CLIENT_ID}&` +
            `redirect_uri=${REDIRECT_URI}&` +
            `response_type=code&` +
            `scope=read:recovery read:sleep read:workout read:cycles read:profile read:body_measurement offline&` +
            `state=${state}`;
        res.redirect(authUrl);
    });
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    const state = req.query.state;

    if (error) return res.status(400).send(`OAuth error: ${error} - ${req.query.error_description || 'No description'}`);
    if (!code) return res.status(400).send('No code provided');
    if (state !== req.session.state) return res.status(400).send('Invalid state parameter');

    try {
        const response = await axios.post(
            `${WHOOP_API_HOSTNAME}/oauth/oauth2/token`,
            querystring.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI
            }),
            { 
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        await fs.writeFile('tokens.json', JSON.stringify({ access_token, refresh_token, expires_in }, null, 2));
        res.send('Tokens saved to tokens.json!');
    } catch (error) {
        console.error('Token exchange failed:', error.response?.status, error.response?.data || error.message);
        res.status(500).send('Authentication failed - check logs');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Visit http://localhost:3000/auth to start');
});