# Basketball Shot Tracker

A web application for basketball players to track and improve their shooting performance over time.

## Features

- **Interactive Shot Tracking**: Click on a basketball court to log shot attempts
- **Performance Analytics**: View shooting percentages, trends, and hot zones
- **Game History**: Track and review past practice sessions
- **Community Leaderboard**: Compare your stats with other players
- **User Profiles**: Personal stats and improvement recommendations
- **Firebase Integration**: Secure authentication and cloud data storage

## Technologies Used

- **Frontend**: Vue.js 3 with TypeScript
- **UI Framework**: Vuetify 4
- **Charts**: Chart.js with vue-chartjs
- **Backend**: Firebase Authentication & Firestore
- **Build Tool**: Vite

## Setup Instructions

### Prerequisites
- Node.js (version 18 or higher)
- Firebase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd team-basketball-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Firebase Configuration**

   Create a Firebase project at [https://firebase.google.com/](https://firebase.google.com/)

   **Enable Authentication:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider

   **Set up Firestore:**
   - Go to Firebase Console → Firestore Database
   - Create database in test mode (or production mode with rules)
   - The app will automatically create these collections:
     - `users` - User profiles
     - `games` - Practice sessions/games
     - `shots` - Individual shot attempts

   **Update Firebase Config:**
   - Go to Project Settings → General → Your apps
   - Copy your Firebase config object
   - Replace the placeholder values in `src/firebase.ts`:

   ```typescript
   const firebaseConfig = {
     apiKey: "your-actual-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Build for production**
   ```bash
   npm run build
   ```

## Usage

1. **Sign Up/Login**: Create an account or sign in
2. **Track Shots**: Go to Shot Tracker and click on the court to log shots
3. **View Analytics**: Check your performance trends and hot zones
4. **Review Games**: See your session history and statistics
5. **Compare**: Check the leaderboard to see how you rank

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── views/              # Page components
│   ├── LoginView.vue
│   ├── DashboardView.vue
│   ├── ShotTrackerView.vue
│   ├── AnalyticsView.vue
│   ├── GamesView.vue
│   ├── ProfileView.vue
│   └── LeaderboardView.vue
├── stores/             # Pinia state management
│   └── auth.ts
├── firebase.ts         # Firebase configuration
├── router.ts          # Vue Router setup
└── main.ts           # App entry point
```

## Database Schema

**Users Collection:**
- user_id (string)
- name (string)
- email (string)
- position (string, optional)
- team (string, optional)

**Games Collection:**
- user_id (string)
- date (timestamp)
- session_type (string)
- total_shots (number)
- made_shots (number)
- shooting_percentage (number)

**Shots Collection:**
- game_id (string)
- user_id (string)
- x_coordinate (number)
- y_coordinate (number)
- made (boolean)
- timestamp (timestamp)

## Deployment

This app can be deployed to:
- **Firebase Hosting**: `firebase deploy`
- **Netlify**: Connect your GitHub repo
- **Vercel**: Connect your GitHub repo

Make sure to set up proper Firebase security rules for production use.

## Course Requirements Checklist

- ✅ **User Authentication**: Firebase Auth with email/password
- ✅ **Cloud Database**: Firestore with multiple collections (users, games, shots)
- ✅ **Private Data**: User's personal games and shots
- ✅ **Shared Data**: Public leaderboard and community challenges
- ✅ **CRUD Operations**: Create, read, update, delete for all data types
- ✅ **Modern Frontend**: Vue.js 3 with TypeScript
- ✅ **Professional Design**: Vuetify UI framework with responsive design
- ✅ **Interactive Features**: Click-to-track shot system, charts, analytics

## Team Members
- [Your name and contributions]

## License
This project is for educational purposes.  
