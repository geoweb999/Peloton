# Peloton Workout Tracker

A modern web-based dashboard for tracking and analyzing your Peloton cycling workouts with real-time data visualization.

## Features

- **Real-time Authentication** - Secure login with your Peloton credentials
- **Comprehensive Dashboard** - View total workouts, miles, calories, and average output
- **Interactive Charts** - Weekly trends and daily performance visualization
- **Multi-metric Analysis** - Switch between output (kJ), distance, and calories views
- **Recent Workout History** - Detailed list of your latest cycling sessions
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Screenshots

### Dashboard Overview
![Dashboard](screenshots/dashboard.png)

### Weekly Trends
![Weekly Chart](screenshots/weekly-chart.png)

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Active Peloton account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/peloton-workout-tracker.git
   cd peloton-workout-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create the public directory**
   ```bash
   mkdir public
   ```

4. **Copy the frontend file**
   - Save `index.html` in the `public/` directory

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Login with your Peloton credentials

## Architecture

### Backend (`server.js`)
- Express.js server that proxies requests to Peloton's API
- Handles CORS issues by acting as a middleman
- Provides secure authentication and session management
- Serves the frontend application

### Frontend (`public/index.html`)
- Single-page application with modern responsive design
- Chart.js for interactive data visualizations
- Real-time data fetching and processing
- Mobile-friendly interface

## API Endpoints

- `POST /api/auth/login` - Authenticate with Peloton
- `GET /api/user/:userId/workouts` - Fetch user's workouts
- `GET /api/workout/:workoutId/performance_graph` - Get detailed workout metrics
- `GET /api/test` - Health check endpoint

## Data Processing

The application processes your Peloton data in several ways:

1. **Weekly Aggregation** - Groups workouts by week for trend analysis
2. **Daily Aggregation** - Combines daily workouts for performance tracking
3. **Metric Calculation** - Converts and formats output, distance, and calories
4. **Time Zone Handling** - Properly processes workout timestamps

## Charts and Visualizations

### Weekly Activity Trends
- Interactive chart with three view modes:
  - **Output (kJ)** - Total weekly power output
  - **Miles** - Total weekly distance
  - **Calories** - Total weekly calories burned
- Shows last 12 weeks of activity

### Performance Over Time
- Daily performance bars showing last 10 days
- Aggregates multiple workouts per day
- Tooltip shows comprehensive daily metrics

## Security

- Credentials are only sent to your local server
- No permanent data storage
- Session management handled securely
- All requests proxied through your local backend

## Development

### Running in Development Mode
```bash
npm run dev
```

### Project Structure
```
peloton-workout-tracker/
├── server.js              # Express backend server
├── package.json           # Dependencies and scripts
├── public/
│   └── index.html         # Frontend application
├── README.md              # This file
└── screenshots/           # Application screenshots
```

### Adding Features

The codebase is structured for easy extension:

- **New API endpoints** - Add routes in `server.js`
- **Additional charts** - Extend the `PelotonTracker` class
- **UI improvements** - Modify the HTML/CSS in `public/index.html`
- **Data processing** - Add methods to handle new metrics

## Troubleshooting

### Common Issues

**Server won't start**
- Check that port 3000 is available
- Ensure Node.js is installed: `node --version`

**Authentication fails**
- Verify your Peloton credentials are correct
- Check server console for detailed error messages

**No workout data**
- Ensure you have cycling workouts in your Peloton account
- Check browser console for network errors

### Debug Mode

The application includes comprehensive logging:
- **Frontend** - Open browser developer tools (F12)
- **Backend** - Check terminal where `npm start` was run

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Roadmap

- [ ] Additional workout types (running, strength)
- [ ] Export data to CSV/PDF
- [ ] Goal setting and tracking
- [ ] Social features and comparisons
- [ ] Mobile app version
- [ ] Offline data caching

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

This application is not affiliated with Peloton Interactive, Inc. It uses publicly available API endpoints for personal data access only.

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Search existing [GitHub issues](https://github.com/yourusername/peloton-workout-tracker/issues)
3. Create a new issue with detailed information
