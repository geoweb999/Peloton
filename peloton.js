const https = require('https');
const fs = require('fs');

class PelotonDataFetcher {
    constructor() {
        this.sessionData = null;
        this.workoutData = [];
    }

    // Make HTTP request helper
    makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            data: jsonData,
                            statusCode: res.statusCode,
                            headers: res.headers
                        });
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            if (postData) {
                req.write(postData);
            }
            
            req.end();
        });
    }

    // Authenticate with Peloton
    async authenticate(username, password) {
        console.log('🔐 Authenticating with Peloton...');
        
        const postData = JSON.stringify({
            username_or_email: username,
            password: password
        });

        const options = {
            hostname: 'api.onepeloton.com',
            port: 443,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        try {
            const response = await this.makeRequest(options, postData);
            
            if (response.statusCode !== 200) {
                throw new Error(`Authentication failed with status ${response.statusCode}`);
            }

            this.sessionData = response.data;
            
            if (!this.sessionData.session_id || !this.sessionData.user_id) {
                throw new Error('Invalid authentication response');
            }

            console.log('✅ Successfully authenticated!');
            console.log(`👤 User ID: ${this.sessionData.user_id}`);
            
            return true;
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            throw error;
        }
    }

    // Get cycling workouts
    async getCyclingWorkouts(limit = 100) {
        console.log('🚴‍♂️ Fetching cycling workouts...');
        
        const options = {
            hostname: 'api.onepeloton.com',
            port: 443,
            path: `/api/user/${this.sessionData.user_id}/workouts?joins=ride,ride.instructor&limit=${limit}&page=0`,
            method: 'GET',
            headers: {
                'Cookie': `peloton_session_id=${this.sessionData.session_id};`,
                'peloton-platform': 'web',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };

        try {
            const response = await this.makeRequest(options);
            
            if (response.statusCode !== 200) {
                throw new Error(`Failed to fetch workouts with status ${response.statusCode}`);
            }

            // Filter for cycling workouts only
            const allWorkouts = response.data.data || [];
            const cyclingWorkouts = allWorkouts.filter(workout => 
                workout.fitness_discipline === 'cycling' || 
                (workout.ride && workout.ride.fitness_discipline === 'cycling')
            );

            // Debug: Show structure of first workout
            if (cyclingWorkouts.length > 0) {
                console.log('\n🔍 DEBUG: First workout structure:');
                console.log('Available fields:', Object.keys(cyclingWorkouts[0]));
                console.log('Sample workout data:');
                const sample = cyclingWorkouts[0];
                console.log({
                    id: sample.id,
                    created_at: sample.created_at,
                    start_time: sample.start_time,
                    end_time: sample.end_time,
                    total_work: sample.total_work,
                    device_time_created_at: sample.device_time_created_at,
                    timezone: sample.timezone,
                    status: sample.status,
                    fitness_discipline: sample.fitness_discipline,
                    // Check for distance/calories fields
                    distance: sample.distance,
                    calories: sample.calories,
                    total_calories: sample.total_calories,
                    total_distance: sample.total_distance,
                    name: sample.name,
                    title: sample.title
                });
                console.log('Ride info:', sample.ride ? {
                    title: sample.ride.title,
                    duration: sample.ride.duration,
                    instructor: sample.ride.instructor?.name,
                    created_at: sample.ride.created_at,
                    scheduled_start_time: sample.ride.scheduled_start_time,
                    original_air_time: sample.ride.original_air_time,
                    distance: sample.ride.distance,
                    distance_display_value: sample.ride.distance_display_value,
                    distance_unit: sample.ride.distance_unit,
                    available_fields: Object.keys(sample.ride)
                } : 'No ride info');
                
                // Check if there are other nested objects that might contain distance/calories
                console.log('\nChecking for nested data structures...');
                Object.keys(sample).forEach(key => {
                    if (typeof sample[key] === 'object' && sample[key] !== null && !Array.isArray(sample[key])) {
                        console.log(`${key}:`, Object.keys(sample[key]));
                    }
                });
                console.log('');
            }

            // Sort by creation date (most recent first)
            cyclingWorkouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            this.workoutData = cyclingWorkouts;
            
            console.log(`✅ Found ${cyclingWorkouts.length} cycling workouts`);
            return cyclingWorkouts;
            
        } catch (error) {
            console.error('❌ Failed to fetch workouts:', error.message);
            throw error;
        }
    }

    // Get detailed workout data (distance, calories, etc.) from performance_graph
    async getDetailedWorkoutData(workouts) {
        console.log(`📊 Fetching detailed data for ${workouts.length} workouts...`);
        
        const headers = {
            'Cookie': `peloton_session_id=${this.sessionData.session_id};`,
            'peloton-platform': 'web',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        for (let i = 0; i < workouts.length; i++) {
            const workout = workouts[i];
            console.log(`   Processing ${i + 1}/${workouts.length}: ${workout.ride?.title || 'Unknown'}`);
            
            try {
                // Get performance graph data which contains distance and calories in summaries
                const options = {
                    hostname: 'api.onepeloton.com',
                    port: 443,
                    path: `/api/workout/${workout.id}/performance_graph?every_n=1000`,
                    method: 'GET',
                    headers: headers
                };

                const response = await this.makeRequest(options);
                
                if (response.statusCode === 200) {
                    const perfData = response.data;
                    
                    // Debug: Show what fields are available in performance graph data
                    if (i === 0) {
                        console.log('\n🔍 DEBUG: Performance graph data structure:');
                        console.log('Available fields:', Object.keys(perfData));
                        console.log('Summaries structure:');
                        if (perfData.summaries && perfData.summaries.length > 0) {
                            console.log('Summaries array length:', perfData.summaries.length);
                            console.log('First few summaries:');
                            perfData.summaries.slice(0, 5).forEach((summary, idx) => {
                                console.log(`  [${idx}]:`, summary);
                            });
                        }
                        if (perfData.average_summaries && perfData.average_summaries.length > 0) {
                            console.log('Average summaries array length:', perfData.average_summaries.length);
                            console.log('First few average summaries:');
                            perfData.average_summaries.slice(0, 5).forEach((summary, idx) => {
                                console.log(`  [${idx}]:`, summary);
                            });
                        }
                        console.log('');
                    }
                    
                    // Extract distance and calories from summaries array
                    // Based on research: summaries[0] = total output, summaries[1] = distance, summaries[2] = calories
                    let distance = 0;
                    let calories = 0;
                    
                    if (perfData.summaries && perfData.summaries.length > 0) {
                        // summaries[1] should be distance, summaries[2] should be calories
                        if (perfData.summaries.length > 1 && perfData.summaries[1]) {
                            distance = perfData.summaries[1].value || 0;
                        }
                        if (perfData.summaries.length > 2 && perfData.summaries[2]) {
                            calories = perfData.summaries[2].value || 0;
                        }
                    }
                    
                    // Extract average metrics from average_summaries array
                    // average_summaries[0] = avg output, [1] = avg cadence, [2] = avg resistance, [3] = avg speed
                    let avgOutput = 0;
                    let avgCadence = 0;
                    let avgResistance = 0;
                    let avgSpeed = 0;
                    
                    if (perfData.average_summaries && perfData.average_summaries.length > 0) {
                        if (perfData.average_summaries.length > 0 && perfData.average_summaries[0]) {
                            avgOutput = perfData.average_summaries[0].value || 0;
                        }
                        if (perfData.average_summaries.length > 1 && perfData.average_summaries[1]) {
                            avgCadence = perfData.average_summaries[1].value || 0;
                        }
                        if (perfData.average_summaries.length > 2 && perfData.average_summaries[2]) {
                            avgResistance = perfData.average_summaries[2].value || 0;
                        }
                        if (perfData.average_summaries.length > 3 && perfData.average_summaries[3]) {
                            avgSpeed = perfData.average_summaries[3].value || 0;
                        }
                    }
                    
                    // Add performance data to the workout object
                    workout.performanceData = perfData;
                    workout.workoutDistance = distance;
                    workout.workoutCalories = calories;
                    workout.workoutAvgOutput = avgOutput;
                    workout.workoutAvgCadence = avgCadence;
                    workout.workoutAvgResistance = avgResistance;
                    workout.workoutAvgSpeed = avgSpeed;
                    
                } else {
                    console.warn(`   ⚠️  Failed to get performance data for workout ${workout.id}: Status ${response.statusCode}`);
                }
                
                // Small delay to be respectful to the API
                if (i < workouts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.warn(`   ⚠️  Error getting performance data for workout ${workout.id}:`, error.message);
            }
        }
        
        console.log('✅ Finished fetching detailed workout data');
    }

    // Format workout data for display
    formatWorkoutData() {
        return this.workoutData.map(workout => {
            // Convert Etc/GMT timezone to proper IANA timezone
            // Note: Etc/GMT+7 is actually UTC-7, which is PDT (Pacific Daylight Time)
            // Etc/GMT+8 would be UTC-8, which is PST (Pacific Standard Time)
            let workoutTimezone = 'America/Los_Angeles'; // Default to Pacific
            if (workout.timezone) {
                if (workout.timezone === 'Etc/GMT+8') {
                    workoutTimezone = 'America/Los_Angeles'; // PST (UTC-8)
                } else if (workout.timezone === 'Etc/GMT+7') {
                    workoutTimezone = 'America/Los_Angeles'; // PDT (UTC-7)
                } else if (workout.timezone === 'Etc/GMT+6') {
                    workoutTimezone = 'America/Chicago'; // CST (UTC-6)
                } else if (workout.timezone === 'Etc/GMT+5') {
                    workoutTimezone = 'America/Chicago'; // CDT (UTC-5) or EST - context dependent
                } else if (workout.timezone === 'Etc/GMT+4') {
                    workoutTimezone = 'America/New_York'; // EDT (UTC-4)
                } else {
                    // For other timezones, try to use them directly or fallback
                    workoutTimezone = workout.timezone;
                }
            }
            
            // Use device_time_created_at if available, fallback to created_at for when I performed the workout
            const workoutDate = workout.device_time_created_at || workout.created_at;
            const myWorkoutDate = new Date(workoutDate * 1000); // Convert timestamp to date
            
            // Use original_air_time as the primary source for class date
            let classDate = null;
            if (workout.ride?.original_air_time) {
                classDate = new Date(workout.ride.original_air_time * 1000);
            } else if (workout.ride?.scheduled_start_time) {
                classDate = new Date(workout.ride.scheduled_start_time * 1000);
            } else if (workout.ride?.created_at) {
                classDate = new Date(workout.ride.created_at * 1000);
            }
            
            // Calculate duration from start_time and end_time (these are timestamps)
            const duration = workout.start_time && workout.end_time ? 
                Math.round((workout.end_time - workout.start_time) / 60) : 
                (workout.ride?.duration ? Math.round(workout.ride.duration / 60) : 0);
            
            const instructorName = workout.ride?.instructor?.name || 'Unknown Instructor';
            const className = workout.ride?.title || 'Cycling Workout';
            
            // Convert total_work from Joules to Kilojoules (divide by 1000)
            const totalOutputKJ = workout.total_work ? workout.total_work / 1000 : 0;
            
            // Look for distance in multiple possible fields, including detailed data
            let distance = 0;
            if (workout.workoutDistance) {
                distance = workout.workoutDistance; // From performance API call - already in miles!
            } else if (workout.distance) {
                distance = workout.distance;
            } else if (workout.total_distance) {
                distance = workout.total_distance;
            } else if (workout.ride?.distance) {
                distance = workout.ride.distance;
            } else if (workout.ride?.distance_display_value) {
                distance = parseFloat(workout.ride.distance_display_value) || 0;
            }
            
            // Look for calories in multiple possible fields, including detailed data
            let calories = 0;
            if (workout.workoutCalories) {
                calories = workout.workoutCalories; // From detailed API call
            } else if (workout.calories) {
                calories = workout.calories;
            } else if (workout.total_calories) {
                calories = workout.total_calories;
            }
            
            // Look for average performance metrics from detailed data
            let avgCadence = 'N/A';
            let avgResistance = 'N/A';  
            let avgSpeed = 'N/A';
            
            if (workout.workoutAvgCadence !== undefined) {
                avgCadence = Math.round(workout.workoutAvgCadence);
            }
            if (workout.workoutAvgResistance !== undefined) {
                avgResistance = `${Math.round(workout.workoutAvgResistance)}%`;
            }
            if (workout.workoutAvgSpeed !== undefined) {
                avgSpeed = `${workout.workoutAvgSpeed.toFixed(1)} mph`;
            }
            
            // Format class title with class air date (classes are typically recorded in EST/EDT)
            const classWithDate = classDate ? 
                `${className} - ${classDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    timeZone: 'America/New_York' // Classes are typically recorded in Eastern time
                })}` : className;
            
            return {
                id: workout.id,
                date: myWorkoutDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: workoutTimezone // Use the actual workout timezone
                }),
                className: classWithDate, // Now includes original air date
                instructorName,
                duration,
                totalOutput: totalOutputKJ, // Now in kJ (converted from Joules)
                calories: calories,
                distance: distance.toFixed(1), // Distance is already in miles from Peloton API
                // Individual workout averages
                avgCadence: avgCadence,
                avgResistance: avgResistance,
                avgSpeed: avgSpeed,
                hasDetailedMetrics: !!(workout.workoutAvgCadence || workout.workoutAvgResistance || workout.workoutAvgSpeed),
                // Debug info
                originalTimezone: workout.timezone,
                convertedTimezone: workoutTimezone,
                rawStartTime: workout.start_time,
                rawEndTime: workout.end_time,
                rawCreatedAt: workout.created_at,
                rawDeviceTime: workout.device_time_created_at,
                rawOriginalAirTime: workout.ride?.original_air_time,
                rawScheduledStartTime: workout.ride?.scheduled_start_time,
                // Debug distance/calories sources
                distanceSource: workout.workoutDistance ? 'detailed API call' :
                               workout.distance ? 'workout.distance' : 
                               workout.total_distance ? 'workout.total_distance' :
                               workout.ride?.distance ? 'workout.ride.distance' :
                               workout.ride?.distance_display_value ? 'workout.ride.distance_display_value' : 'none',
                caloriesSource: workout.workoutCalories ? 'detailed API call' :
                               workout.calories ? 'workout.calories' : 
                               workout.total_calories ? 'workout.total_calories' : 'none',
                rawDistance: workout.distance,
                rawTotalDistance: workout.total_distance,
                rawRideDistance: workout.ride?.distance,
                rawRideDistanceDisplay: workout.ride?.distance_display_value,
                rawCalories: workout.calories,
                rawTotalCalories: workout.total_calories
            };
        });
    }

    // Generate summary statistics
    generateSummary() {
        const totalWorkouts = this.workoutData.length;
        
        // Calculate total distance from workouts that have distance data
        const totalDistance = this.workoutData.reduce((sum, w) => {
            const distance = w.workoutDistance || w.distance || 0; // Already in miles
            return sum + distance;
        }, 0);
        
        // Calculate total calories from workouts that have calories data
        const totalCalories = this.workoutData.reduce((sum, w) => {
            const calories = w.workoutCalories || w.calories || 0;
            return sum + calories;
        }, 0);
        
        const totalWork = this.workoutData.reduce((sum, w) => sum + (w.total_work || 0), 0);
        const avgWork = totalWorkouts > 0 ? (totalWork / 1000) / totalWorkouts : 0; // Convert to kJ

        // Calculate average metrics from workouts that have performance data
        const workoutsWithPerformanceData = this.workoutData.filter(w => w.workoutAvgOutput);
        const performanceWorkoutCount = workoutsWithPerformanceData.length;
        
        const avgOutput = performanceWorkoutCount > 0 ? 
            workoutsWithPerformanceData.reduce((sum, w) => sum + (w.workoutAvgOutput || 0), 0) / performanceWorkoutCount : 0;
            
        const avgCadence = performanceWorkoutCount > 0 ? 
            workoutsWithPerformanceData.reduce((sum, w) => sum + (w.workoutAvgCadence || 0), 0) / performanceWorkoutCount : 0;
            
        const avgResistance = performanceWorkoutCount > 0 ? 
            workoutsWithPerformanceData.reduce((sum, w) => sum + (w.workoutAvgResistance || 0), 0) / performanceWorkoutCount : 0;
            
        const avgSpeed = performanceWorkoutCount > 0 ? 
            workoutsWithPerformanceData.reduce((sum, w) => sum + (w.workoutAvgSpeed || 0), 0) / performanceWorkoutCount : 0;

        return {
            totalWorkouts,
            totalDistance: totalDistance.toFixed(1), // Already in miles
            totalCalories,
            performanceDataCount: performanceWorkoutCount
        };
    }

    // Save data to JSON file
    saveToFile(filename = 'peloton_cycling_data.json') {
        const data = {
            summary: this.generateSummary(),
            workouts: this.formatWorkoutData(),
            rawData: this.workoutData,
            exportedAt: new Date().toISOString()
        };

        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`💾 Data saved to ${filename}`);
        return filename;
    }

    // Display summary in console
    displaySummary() {
        const summary = this.generateSummary();
        const formattedWorkouts = this.formatWorkoutData();

        console.log('\n🏆 PELOTON CYCLING SUMMARY');
        console.log('═'.repeat(50));
        console.log(`📊 Total Workouts: ${summary.totalWorkouts}`);
        console.log(`🛣️  Total Distance: ${summary.totalDistance} miles`);
        console.log(`🔥 Total Calories: ${summary.totalCalories.toLocaleString()}`);
        console.log(`📈 Detailed metrics available for ${summary.performanceDataCount} recent workouts`);
        
        console.log('\n🚴‍♂️ RECENT WORKOUTS');
        console.log('═'.repeat(50));
        
        formattedWorkouts.slice(0, 10).forEach((workout, index) => {
            console.log(`${index + 1}. ${workout.className}`); // Class name now includes recording date
            console.log(`   👨‍🏫 ${workout.instructorName} | ⏱️  ${workout.duration}min | 📅 My workout: ${workout.date}`);
            console.log(`   ⚡ ${workout.totalOutput.toFixed(1)} kJ | 🔥 ${workout.calories} cal | 🛣️  ${workout.distance}mi`);
            console.log(`   🚴 ${workout.avgCadence} rpm | 💪 ${workout.avgResistance} | 🏃 ${workout.avgSpeed}`);
            console.log('');
        });
    }
}

// Main execution function
async function main() {
    const fetcher = new PelotonDataFetcher();
    
    try {
        // Get credentials from environment variables
        const username = process.env.PELOTON_USERNAME;
        const password = process.env.PELOTON_PASSWORD;
        
        if (!username || !password) {
            console.log('❌ Please set your Peloton credentials:');
            console.log('   Option 1: Set environment variables:');
            console.log('     export PELOTON_USERNAME="your-email@example.com"');
            console.log('     export PELOTON_PASSWORD="your-password"');
            console.log('   Option 2: Edit the script and set credentials directly:');
            console.log('     const username = "your-email@example.com";');
            console.log('     const password = "your-password";');
            console.log('');
            console.log('   Current values:');
            console.log(`     PELOTON_USERNAME: ${username ? '✅ Set' : '❌ Not set'}`);
            console.log(`     PELOTON_PASSWORD: ${password ? '✅ Set' : '❌ Not set'}`);
            process.exit(1);
        }

        // Authenticate
        await fetcher.authenticate(username, password);
        
        // Get cycling workouts
        const workouts = await fetcher.getCyclingWorkouts(100);
        
        if (workouts.length === 0) {
            console.log('❌ No cycling workouts found');
            return;
        }
        
        // Get detailed metrics (including distance/calories) for recent workouts
        console.log('📊 Fetching distance and calories data for recent workouts...');
        await fetcher.getDetailedWorkoutData(workouts.slice(0, 10)); // Get details for first 10 workouts
        
        // Display summary
        fetcher.displaySummary();
        
        // Save to file
        const filename = fetcher.saveToFile();
        
        console.log(`\n✅ Complete! Your cycling data has been exported to ${filename}`);
        console.log('📱 You can now use this data with the dashboard or other analysis tools');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = PelotonDataFetcher;

// Run if called directly
if (require.main === module) {
    main();
}
