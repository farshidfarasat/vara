# Netlify Function Setup

This project includes a Netlify serverless function to proxy the Navasan API and avoid CORS/mixed content issues.

## Setup

1. Deploy to Netlify (via GitHub, GitLab, or manual upload)
2. The function is automatically available at: `/.netlify/functions/fetch-rate`
3. No additional configuration needed

## How it works

- The function proxies requests to the Navasan API
- Handles CORS headers automatically
- Works with HTTPS sites (no mixed content issues)
- The frontend code will automatically try this endpoint first

## Alternative: GitHub Pages

If using GitHub Pages, you'll need to:
1. Use a different hosting service that supports serverless functions (Netlify, Vercel, etc.)
2. Or use a third-party CORS proxy service
3. Or contact Navasan to enable CORS on their API

## Testing

After deployment, check the browser console. You should see:
- "Attempting to fetch from: /.netlify/functions/fetch-rate"
- "Exchange rate updated to: [number]"

If you see errors, check the Netlify function logs in the Netlify dashboard.

