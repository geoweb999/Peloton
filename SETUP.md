# Setup Instructions

Follow these steps to set up your Peloton Workout Tracker repository on GitHub and run it locally.

## Part 1: Create GitHub Repository

### 1. Create a new repository on GitHub
1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Repository name: `peloton-workout-tracker`
5. Description: "A modern web-based dashboard for tracking Peloton cycling workouts"
6. Set to **Public** (or Private if you prefer)
7. ✅ Check "Add a README file"
8. Choose MIT License
9. Click "Create repository"

### 2. Clone the repository locally
```bash
git clone https://github.com/YOURUSERNAME/peloton-workout-tracker.git
cd peloton-workout-tracker
```

## Part 2: Add Project Files

### 1. Create the project structure
```bash
mkdir public
```

### 2. Add the files (copy content from artifacts)

**server.js** - Copy the backend server code
**package.json** - Copy the package.json content
**public/index.html** - Copy the frontend HTML code
**.gitignore** - Copy the gitignore content
**LICENSE** - Should already exist, or copy the license content
**README.md** - Replace the default with the detailed README

### 3. Install dependencies
```bash
npm install
```

## Part 3: Test the Application

### 1. Start the server
```bash
npm start
```

### 2. Test the application
1. Open browser to `http://localhost:3000`
2. Try the test endpoint: `http://localhost:3000/api/test`
3. Login with your Peloton credentials
4. Verify the dashboard loads with your data

## Part 4: Commit and Push

### 1. Add all files to git
```bash
git add .
git commit -m "Initial commit: Add Peloton workout tracker application

- Express.js backend server with Peloton API proxy
- Modern responsive frontend with interactive charts
- Weekly trends and daily performance visualization  
- Real-time authentication and data fetching
- Support for output, distance, and calorie metrics"
```

### 2. Push to GitHub
```bash
git push origin main
```

## Part 5: Repository Configuration

### 1. Add topics/tags to your repository
In your GitHub repository settings, add topics:
- `peloton`
- `fitness-tracker`  
- `workout-analytics`
- `javascript`
- `nodejs`
- `charts`
- `dashboard`

### 2. Create repository sections (optional)
- **Issues** - Enable for bug reports and feature requests
- **Projects** - For planning future features
- **Wiki** - For additional documentation

### 3. Add screenshots (optional)
1. Take screenshots of your running application
2. Create a `screenshots/` folder
3. Add images and reference them in README.md

## Part 6: Documentation

### 1. Update the README
- Replace "yourusername" with your actual GitHub username
- Add actual screenshots if you created them
- Customize any sections specific to your setup

### 2. Consider adding:
- **CONTRIBUTING.md** - Guidelines for contributors
- **CHANGELOG.md** - Track version changes
- **docs/** folder - Additional documentation

## Repository URL Structure

Your repository will be available at:
```
https://github.com/YOURUSERNAME/peloton-workout-tracker
```

## Next Steps

Now you can:
- **Share the repository** with others
- **Create issues** for bugs or feature requests  
- **Accept pull requests** from contributors
- **Create releases** when you add new features
- **Set up GitHub Actions** for automated testing/deployment

## Development Workflow

For future changes:
```bash
# Create a feature branch
git checkout -b feature-name

# Make changes
git add .
git commit -m "Add feature description"

# Push branch
git push origin feature-name

# Create pull request on GitHub
# Merge when ready
```

## Collaboration

To collaborate with others:
1. They can fork your repository
2. Create pull requests with improvements
3. You can review and merge changes
4. Use Issues to track bugs and feature requests

Your Peloton Workout Tracker is now ready for collaborative development!
