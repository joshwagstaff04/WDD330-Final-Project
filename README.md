# Meal Planner & Grocery Helper

A vanilla JavaScript web application for meal planning and grocery list management. Built as a WDD330 Final Project.

## Current Progress (First Submission)

**Completed:**
- ✅ Project structure set up (folders, files, config)
- ✅ Basic HTML layouts for all pages
- ✅ Spoonacular API connection working
- ✅ Recipe search with filters functional
- ✅ Recipe details page displays data
- ✅ Save recipes to localStorage
- ✅ View saved recipes
- ✅ Basic CSS styling

**In Progress / TODO:**
- 🚧 Meal planner (structure in place, needs functionality)
- 🚧 Grocery list generation
- 🚧 Open Food Facts API integration (for grocery feature)
- 🚧 Better styling and animations
- 🚧 Mobile responsive improvements

## Planned Features

- 🔍 **Recipe Search** - Search recipes by keyword, diet, cuisine
- 📖 **Recipe Details** - View ingredients, instructions, and nutrition
- 📅 **Weekly Meal Planner** - Plan meals for the week
- 🛒 **Smart Grocery Lists** - Auto-generate shopping lists
- 💾 **Local Storage** - Save recipes and meal plans
- 🥗 **Product Nutrition** - Look up packaged food nutrition

## Technologies

- HTML5
- CSS3 (basic responsive design)
- Vanilla JavaScript (ES6 modules)
- Spoonacular API
- LocalStorage

## Setup

1. **Get a Spoonacular API Key**
   - Sign up at https://spoonacular.com/food-api/console (it's free)

2. **Add Your API Key**
   - Open `js/config.js`
   - Replace `YOUR_API_KEY_HERE` with your actual key

3. **Open in Browser**
   - Just open `index.html` in your browser
   - Or use Live Server in VS Code

## Project Structure

```
WDD330-Final-Project/
├── index.html           # Main page with all views
├── css/
│   ├── styles.css       # Basic styling
│   └── animations.css   # Simple animations
├── js/
│   ├── app.js          # Main application logic
│   ├── data.js         # API calls and localStorage
│   └── config.js       # API keys (git-ignored)
└── images/
    └── logo.svg
```

## API Usage & Limits

### Spoonacular API
- **Free Tier:** 50 points/day
- **Rate Limit:** 1 request/second
- Requests are cached for 1 hour to conserve quota
- [API Documentation](https://spoonacular.com/food-api/docs)

### Open Food Facts API
- **No API key required**
- **Rate Limits:** 100 products/min, 10 searches/min
- [API Documentation](https://wiki.openfoodfacts.org/API)

## What's Working Now

- Recipe search page with filters
- View recipe details with ingredients and instructions
- Save/unsave recipes
- View saved recipes list
- Basic localStorage persistence

## Known Issues / Next Steps

- Need to build out meal planner functionality
- Grocery list is just a placeholder
- Could use better error handling
- Mobile layout needs work
- Add more CSS polish

## License

Educational project for WDD330 - Web Development II

## Attributions

- Recipe data powered by [Spoonacular API](https://spoonacular.com/food-api)
- Product nutrition from [Open Food Facts](https://world.openfoodfacts.org)
