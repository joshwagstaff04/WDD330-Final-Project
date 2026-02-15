/**
 * Configuration File - Example
 * 
 * Copy this file to 'config.js' and add your API keys.
 * config.js is git-ignored to keep your keys private.
 */

const config = {
    // Spoonacular API Configuration
    // Get your free API key at: https://spoonacular.com/food-api/console
    spoonacular: {
        apiKey: 'YOUR_SPOONACULAR_API_KEY_HERE',
        baseUrl: 'https://api.spoonacular.com',
        rateLimit: 1000, // milliseconds between requests (1 req/sec)
        cacheDuration: 3600000 // 1 hour in milliseconds
    },
    
    // Open Food Facts API Configuration
    // No API key needed - just set a custom User-Agent
    openFoodFacts: {
        baseUrl: 'https://world.openfoodfacts.org',
        userAgent: 'MealPlanner-WDD330/1.0 (your-email@example.com)'
    }
};

export default config;
