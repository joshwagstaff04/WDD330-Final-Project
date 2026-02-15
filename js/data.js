// API stuff and localStorage
// trying to keep this separate from the DOM code

import config from '../config.js';

// had to add this for the rate limit thing
let lastApiCall = 0;

// search recipes from spoonacular
async function searchRecipes(query, filters = {}) {
  // wait 1 sec or the API throws errors
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  const url = new URL(`${config.spoonacular.baseUrl}/recipes/complexSearch`);
  url.searchParams.append('apiKey', config.spoonacular.apiKey);
  url.searchParams.append('query', query);
  url.searchParams.append('number', 12);
  url.searchParams.append('addRecipeInformation', true);
  
  // add the filters
  if (filters.diet) url.searchParams.append('diet', filters.diet);
  if (filters.cuisine) url.searchParams.append('cuisine', filters.cuisine);
  if (filters.maxReadyTime) url.searchParams.append('maxReadyTime', filters.maxReadyTime);

  console.log('Searching recipes:', query);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch recipes');
  }
  
  const data = await response.json();
  return data;
}

async function getRecipeDetails(recipeId) {
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  const url = new URL(`${config.spoonacular.baseUrl}/recipes/${recipeId}/information`);
  url.searchParams.append('apiKey', config.spoonacular.apiKey);
  url.searchParams.append('includeNutrition', true);

  console.log('Getting recipe details for:', recipeId);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch recipe details');
  }
  
  const data = await response.json();
  return data;
}

async function getRandomRecipes(count = 3) {
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  const url = new URL(`${config.spoonacular.baseUrl}/recipes/random`);
  url.searchParams.append('apiKey', config.spoonacular.apiKey);
  url.searchParams.append('number', count);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch random recipes');
  }
  
  const data = await response.json();
  return data;
}

// localStorage stuff
function getSavedRecipes() {
  const saved = localStorage.getItem('savedRecipes');
  return saved ? JSON.parse(saved) : [];
}

function saveRecipe(recipe) {
  const saved = getSavedRecipes();
  
  // don't save duplicates
  const exists = saved.find(r => r.id === recipe.id);
  if (exists) {
    console.log('Recipe already saved');
    return false;
  }
  
  // only saving what I need, not the whole object
  saved.push({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings
  });
  
  localStorage.setItem('savedRecipes', JSON.stringify(saved));
  console.log('Saved recipe:', recipe.title);
  return true;
}

function removeRecipe(recipeId) {
  const saved = getSavedRecipes();
  const filtered = saved.filter(r => r.id !== recipeId);
  localStorage.setItem('savedRecipes', JSON.stringify(filtered));
  console.log('Removed recipe:', recipeId);
}

function isRecipeSaved(recipeId) {
  const saved = getSavedRecipes();
  return saved.some(r => r.id === recipeId);
}

// TODO: meal plan functions go here
// TODO: grocery list

export { 
  searchRecipes, 
  getRecipeDetails, 
  getRandomRecipes,
  getSavedRecipes,
  saveRecipe,
  removeRecipe,
  isRecipeSaved
};
