// server.js - Simple Node.js proxy server for Peloton API
const express = require('express');
const https = require('https');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML file from public directory

// Proxy function to make requests to Peloton API
function makeRequestToPeloton(apiPath, options = {}) {
    return new Promise((resolve, reject) => {
        const postData = options.body;
        
        const requestOptions = {
            hostname: 'api.onepeloton.com',
            port: 443,
            path: apiPath,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PelotonApp/3.0.0 (iPhone; iOS 14.0; Scale/3.00)',
                'peloton-platform': 'ios',
                ...options.headers
            }
        };

        // Add Content-Length for POST requests
        if (postData) {
            requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        console.log('Making request to Peloton:', {
            path: apiPath,
            method: requestOptions.method,
            headers: { 
                ...requestOptions.headers, 
                'Cookie': requestOptions.headers.Cookie ? '[SESSION_COOKIE]' : 'None'
            }
        });

        const req = https.request(requestOptions, (res) => {
            let data = '';
            
            console.log('Peloton response status:', res.statusCode);
            console.log('Peloton response headers:', res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('Raw response data length:', data.length);
                console.log('Raw response preview:', data.substring(0, 200));
                
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    console.error('Failed to parse JSON response:', error);
                    console.error('Raw response:', data);
                    reject(new Error(`Failed to parse JSON: ${error.message}. Raw response: ${data.substring(0, 500)}`));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.on('timeout', () => {
            console.error('Request timeout');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        // Set timeout
        req.setTimeout(10000); // 10 seconds
        
        if (postData) {
            console.log('Writing POST data...');
            req.write(postData);
        }
        
        req.end();
    });
}

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called');
    res.json({ 
        status: 'Server is running!', 
        timestamp: new Date().toISOString(),
        message: 'Backend proxy server is working correctly'
    });
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        console.log('🔐 Authentication request received');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { username, password } = req.body;
        console.log('Extracted username:', username ? `"${username}"` : 'MISSING');
        console.log('Extracted password:', password ? '[PROVIDED]' : 'MISSING');
        console.log('Username length:', username ? username.length : 0);
        console.log('Password length:', password ? password.length : 0);
        
        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required',
                received: {
                    username: !!username,
                    password: !!password,
                    usernameValue: username || 'null',
                    bodyKeys: Object.keys(req.body)
                }
            });
        }
        
        const postData = JSON.stringify({
            username_or_email: username.trim(),
            password: password
        });
        
        console.log('Sending to Peloton:', {
            username_or_email: username.trim(),
            password: '[REDACTED]'
        });
        
        const response = await makeRequestToPeloton('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'PelotonApp/3.0.0 (iPhone; iOS 14.0; Scale/3.00)',
                'peloton-platform': 'ios'
            },
            body: postData
        });
        
        console.log('Peloton API response status:', response.statusCode);
        console.log('Response data keys:', Object.keys(response.data || {}));
        
        if (response.statusCode === 200) {
            if (response.data.session_id && response.data.user_id) {
                console.log('✅ Authentication successful - User ID:', response.data.user_id);
                res.json(response.data);
            } else {
                console.log('❌ Authentication response missing required fields');
                console.log('Response data:', JSON.stringify(response.data, null, 2));
                res.status(401).json({ 
                    error: 'Invalid credentials - missing session data',
                    details: response.data
                });
            }
        } else if (response.statusCode === 401) {
            console.log('❌ Authentication failed - Invalid credentials');
            console.log('Peloton error response:', JSON.stringify(response.data, null, 2));
            res.status(401).json({ 
                error: 'Invalid username or password',
                statusCode: response.statusCode,
                pelotonError: response.data
            });
        } else {
            console.log('❌ Authentication failed - Unexpected status:', response.statusCode);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            res.status(response.statusCode).json({ 
                error: 'Authentication failed - unexpected response',
                statusCode: response.statusCode,
                details: response.data
            });
        }
    } catch (error) {
        console.error('❌ Auth error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ error: 'Authentication failed: ' + error.message });
    }
});

// Get workouts endpoint
app.get('/api/user/:userId/workouts', async (req, res) => {
    try {
        console.log('🚴‍♂️ Fetching workouts for user:', req.params.userId);
        
        const { userId } = req.params;
        const { limit = 50, page = 0 } = req.query;
        const sessionId = req.headers['x-peloton-session'];
        
        console.log('Request params:', { userId, limit, page });
        console.log('Session ID provided:', sessionId ? 'Yes' : 'No');
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Session ID required' });
        }
        
        // Updated workout endpoint path - removed the leading /api
        const workoutPath = `/api/user/${userId}/workouts?joins=ride,ride.instructor&limit=${limit}&page=${page}`;
        console.log('Making request to path:', workoutPath);
        
        const response = await makeRequestToPeloton(workoutPath, {
            headers: {
                'Cookie': `peloton_session_id=${sessionId};`,
                'peloton-platform': 'web'
            }
        });
        
        console.log('Peloton workout response status:', response.statusCode);
        
        if (response.statusCode === 200) {
            const workoutCount = response.data?.data?.length || 0;
            console.log(`✅ Found ${workoutCount} workouts`);
            
            // Log first workout structure for debugging
            if (workoutCount > 0) {
                const firstWorkout = response.data.data[0];
                console.log('First workout keys:', Object.keys(firstWorkout));
                console.log('Fitness discipline:', firstWorkout.fitness_discipline);
                console.log('Has ride info:', !!firstWorkout.ride);
            }
            
            res.json(response.data);
        } else if (response.statusCode === 404) {
            console.log('❌ Workout endpoint not found - trying alternative path');
            
            // Try alternative endpoint path
            const altPath = `/api/user/${userId}/workout_history?joins=ride,ride.instructor&limit=${limit}&page=${page}`;
            console.log('Trying alternative path:', altPath);
            
            try {
                const altResponse = await makeRequestToPeloton(altPath, {
                    headers: {
                        'Cookie': `peloton_session_id=${sessionId};`,
                        'peloton-platform': 'web'
                    }
                });
                
                console.log('Alternative path response status:', altResponse.statusCode);
                
                if (altResponse.statusCode === 200) {
                    console.log(`✅ Alternative path worked - found ${altResponse.data?.data?.length || 0} workouts`);
                    res.json(altResponse.data);
                } else {
                    res.status(altResponse.statusCode).json({ 
                        error: 'Failed to fetch workouts from alternative endpoint',
                        statusCode: altResponse.statusCode,
                        originalPath: workoutPath,
                        alternativePath: altPath
                    });
                }
            } catch (altError) {
                console.error('Alternative path also failed:', altError.message);
                res.status(404).json({
                    error: 'Both workout endpoints failed',
                    originalError: 'Original path returned 404',
                    alternativeError: altError.message,
                    paths: [workoutPath, altPath]
                });
            }
        } else {
            console.log('❌ Unexpected response status:', response.statusCode);
            console.log('Response data:', JSON.stringify(response.data, null, 2));
            res.status(response.statusCode).json({ 
                error: 'Failed to fetch workouts',
                statusCode: response.statusCode,
                details: response.data
            });
        }
    } catch (error) {
        console.error('❌ Workouts error:', error.message);
        res.status(500).json({ error: 'Failed to fetch workouts: ' + error.message });
    }
});

// Get workout performance data
app.get('/api/workout/:workoutId/performance_graph', async (req, res) => {
    try {
        const { workoutId } = req.params;
        const { every_n = 1000 } = req.query;
        const sessionId = req.headers['x-peloton-session'];
        
        if (!sessionId) {
            return res.status(401).json({ error: 'Session ID required' });
        }
        
        const response = await makeRequestToPeloton(
            `/api/workout/${workoutId}/performance_graph?every_n=${every_n}`,
            {
                headers: {
                    'Cookie': `peloton_session_id=${sessionId};`,
                    'peloton-platform': 'web'
                }
            }
        );
        
        if (response.statusCode === 200) {
            res.json(response.data);
        } else {
            res.status(response.statusCode).json({ 
                error: 'Failed to fetch performance data',
                statusCode: response.statusCode 
            });
        }
    } catch (error) {
        console.error('❌ Performance data error:', error.message);
        res.status(500).json({ error: 'Failed to fetch performance data: ' + error.message });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Peloton Tracker Server running on http://localhost:${PORT}`);
    console.log(`📁 Place your HTML file in the 'public' directory as 'index.html'`);
    console.log(`🔐 API endpoints available at /api/*`);
});

module.exports = app;