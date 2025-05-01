// Netlify Function to proxy requests to Railway backend
// This bypasses CORS issues by making the request server-side

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Get the request body
    const requestBody = JSON.parse(event.body);
    
    // The Railway webhook URL
    const webhookUrl = 'https://primary-production-6722.up.railway.app/webhook/34315acb-a2fe-4d8f-9803-cdd663bf1625';
    
    // Forward the request to Railway
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb2FuLW9mZmljZXItcG9ydGFsIiwiaWF0IjoxNjgyNTk1MzY3fQ.Qz2KhCypSXnVJRv8DuLXbW4ZVeYS7gX5M2jQ8PwT3Rk'
      },
      body: JSON.stringify(requestBody)
    });

    // Get the response data
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // Return the response from Railway
    return {
      statusCode: response.status,
      body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
      headers: {
        'Content-Type': contentType || 'application/json'
      }
    };
  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy request', message: error.message })
    };
  }
};
