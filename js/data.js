// data.js
// handles API calls and localStorage for the meal planner app
// keeping data separate from the UI code

const API_KEY = '371a703dcddd47198cb6180b04fe5055';
const BASE_URL = 'https://api.spoonacular.com';

// API

// search recipes main search on the home page
async function searchRecipes(query, filters = {}) {
  let url = `${BASE_URL}/recipes/complexSearch?apiKey=${API_KEY}&query=${encodeURIComponent(query)}&number=12&addRecipeInformation=true`;

  if (filters.diet) url += `&diet=${filters.diet}`;
  if (filters.cuisine) url += `&cuisine=${filters.cuisine}`;
  if (filters.maxReadyTime) url += `&maxReadyTime=${filters.maxReadyTime}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

// get all the info for one recipe ingredients, steps, nutrition etc
async function getRecipeDetails(recipeId) {
  const url = `${BASE_URL}/recipes/${recipeId}/information?apiKey=${API_KEY}&includeNutrition=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not get recipe details');
  return response.json();
}

// random recipes for the featured section on the homepage
async function getRandomRecipes(count = 6) {
  const url = `${BASE_URL}/recipes/random?apiKey=${API_KEY}&number=${count}`;
  const response = await fetch(url);
  return response.json();
}


// saved recipes

function getSavedRecipes() {
  const saved = localStorage.getItem('savedRecipes');
  if (!saved) return [];
  return JSON.parse(saved);
}

// saves a recipe, skips duplicates
function saveRecipe(recipe) {
  const savedRecipes = getSavedRecipes();

  // check if we already have it
  const alreadyThere = savedRecipes.find(r => r.id === recipe.id);
  if (alreadyThere) {
    return false;
  }

  // store the full object so detail pages never need to re-fetch
  savedRecipes.push(recipe);
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  return true;
}

function removeRecipe(recipeId) {
  const savedRecipes = getSavedRecipes();
  const updated = [];
  for (let i = 0; i < savedRecipes.length; i++) {
    if (savedRecipes[i].id !== recipeId) {
      updated.push(savedRecipes[i]);
    }
  }
  localStorage.setItem('savedRecipes', JSON.stringify(updated));
}

function isRecipeSaved(recipeId) {
  const savedRecipes = getSavedRecipes();
  return savedRecipes.some(r => r.id === recipeId);
}


// meal plans
// stored as an object keyed by year-month 
// each month has 7 days, each day has breakfast/lunch/dinner slots

function getCurrentMonthId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMealPlans() {
  const plans = localStorage.getItem('mealPlans');
  if (!plans) return {};
  return JSON.parse(plans);
}

// gets the plan for a specific week, creates an empty one if it doesn't exist yet
function getMealPlanForWeek(monthId) {
  const allPlans = getMealPlans();

  if (!allPlans[monthId]) {
    allPlans[monthId] = {
      monthId,
      meals: {
        Monday: { breakfast: null, lunch: null, dinner: null },
        Tuesday: { breakfast: null, lunch: null, dinner: null },
        Wednesday: { breakfast: null, lunch: null, dinner: null },
        Thursday: { breakfast: null, lunch: null, dinner: null },
        Friday: { breakfast: null, lunch: null, dinner: null },
        Saturday: { breakfast: null, lunch: null, dinner: null },
        Sunday: { breakfast: null, lunch: null, dinner: null }
      }
    };
    localStorage.setItem('mealPlans', JSON.stringify(allPlans));
  }

  return allPlans[monthId];
}

function saveMealPlanWeek(monthId, plan) {
  const allPlans = getMealPlans();
  allPlans[monthId] = plan;
  localStorage.setItem('mealPlans', JSON.stringify(allPlans));
}

function addMealToDay(monthId, day, mealType, recipeId) {
  const plan = getMealPlanForWeek(monthId);

  plan.meals[day][mealType] = {
    recipeId: recipeId,
    servings: 4
  };

  saveMealPlanWeek(monthId, plan);
}

function removeMealFromDay(monthId, day, mealType) {
  const plan = getMealPlanForWeek(monthId);
  plan.meals[day][mealType] = null;
  saveMealPlanWeek(monthId, plan);
}

function clearMealPlan(monthId) {
  const allPlans = getMealPlans();
  delete allPlans[monthId];
  localStorage.setItem('mealPlans', JSON.stringify(allPlans));
}


// grocery list

function getGroceryItems() {
  const items = localStorage.getItem('groceryItems');
  if (!items) return [];
  return JSON.parse(items);
}

function saveGroceryItems(items) {
  localStorage.setItem('groceryItems', JSON.stringify(items));
}

function addGroceryItem(name, amount, unit) {
  const items = getGroceryItems();
  const id = 'item-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
  items.push({ id: id, name: name, amount: amount || null, unit: unit || '', checked: false });
  saveGroceryItems(items);
  return id;
}

function toggleGroceryItem(itemId) {
  const items = getGroceryItems();
  const item = items.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    saveGroceryItems(items);
  }
}

function removeGroceryItem(itemId) {
  const items = getGroceryItems().filter(i => i.id !== itemId);
  saveGroceryItems(items);
}

function clearGroceryItems() {
  localStorage.removeItem('groceryItems');
}

// Open Food Facts, no API key needed
async function searchFood(query) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=3&fields=product_name,nutriments,nutrition_grade_fr`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Food lookup failed');
  return response.json();
}

export {
  searchRecipes,
  getRecipeDetails,
  getRandomRecipes,
  getSavedRecipes,
  saveRecipe,
  removeRecipe,
  isRecipeSaved,
  getCurrentMonthId,
  getMealPlanForWeek,
  addMealToDay,
  removeMealFromDay,
  clearMealPlan,
  getGroceryItems,
  saveGroceryItems,
  addGroceryItem,
  toggleGroceryItem,
  removeGroceryItem,
  clearGroceryItems,
  searchFood
};
