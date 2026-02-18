// data.js
// handles API calls and localStorage for the meal planner app
// keeping data separate from the UI code 

import config from './config.js';

// need to track last API call time bc spoonacular rate limits at 1 req/sec
let lastApiCall = 0;

// search recipes -- main search on the home page
async function searchRecipes(query, filters = {}) {
  // wait if we called the API too recently
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  // build the url manually, easier to read imo
  let url = `${config.baseUrl}/recipes/complexSearch?apiKey=${config.apiKey}&query=${query}&number=12&addRecipeInformation=true`;

  // add filters if they were set
  if (filters.diet) url += `&diet=${filters.diet}`;
  if (filters.cuisine) url += `&cuisine=${filters.cuisine}`;
  if (filters.maxReadyTime) url += `&maxReadyTime=${filters.maxReadyTime}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('search failed');

  const recipeData = await response.json();
  return recipeData;
}

// get all the info for one recipe  ingredients, steps, nutrition etc
async function getRecipeDetails(recipeId) {
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  const url = `${config.baseUrl}/recipes/${recipeId}/information?apiKey=${config.apiKey}&includeNutrition=true`;

  console.log('fetching recipe:', recipeId); // TODO: remove this later

  const response = await fetch(url);
  if (!response.ok) throw new Error('could not get recipe details');

  const recipeData = await response.json();
  return recipeData;
}

// random recipes for the featured section on homepage
async function getRandomRecipes(count = 3) {
  const now = Date.now();
  if (now - lastApiCall < 1000) {
    await new Promise(resolve => setTimeout(resolve, 1000 - (now - lastApiCall)));
  }
  lastApiCall = Date.now();

  const url = `${config.baseUrl}/recipes/random?apiKey=${config.apiKey}&number=${count}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('random recipes failed');

  const data = await response.json();
  return data;
}


// ---- SAVED RECIPES ----

function getSavedRecipes() {
  const saved = localStorage.getItem('savedRecipes');
  if (!saved) return [];
  return JSON.parse(saved);
}

// saves a recipe -- also handles not saving duplicates
// this function does a little more than it probably should but whatever, it works
function saveRecipe(recipe) {
  const savedRecipes = getSavedRecipes();

  // check if we already have it
  const alreadyThere = savedRecipes.find(r => r.id === recipe.id);
  if (alreadyThere) {
    console.log('already saved');
    return false;
  }

  // the API returns a huge object, only grab what we actually need
  const recipeToSave = {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes,
    servings: recipe.servings
  };

  savedRecipes.push(recipeToSave);
  localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
  return true;
}

function removeRecipe(recipeId) {
  const savedRecipes = getSavedRecipes();
  const updated = [];
  // could use filter() here but this is easier to read imo
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


// ---- MEAL PLANS ----
// stored as an object keyed by year-month like "2026-02"
// each month has 7 days, each day has breakfast/lunch/dinner slots

// just use year + month as the key, dont need anything fancier than that
function getCurrentWeekId() {
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
function getMealPlanForWeek(weekId) {
  const allPlans = getMealPlans();

  if (!allPlans[weekId]) {
    allPlans[weekId] = {
      weekId: weekId,
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

  return allPlans[weekId];
}

function saveMealPlanWeek(weekId, plan) {
  const allPlans = getMealPlans();
  allPlans[weekId] = plan;
  localStorage.setItem('mealPlans', JSON.stringify(allPlans));
}

function addMealToDay(weekId, day, mealType, recipeId, servings) {
  const plan = getMealPlanForWeek(weekId);

  plan.meals[day][mealType] = {
    recipeId: recipeId,
    servings: servings || 4
  };

  saveMealPlanWeek(weekId, plan);
}

function removeMealFromDay(weekId, day, mealType) {
  const plan = getMealPlanForWeek(weekId);
  plan.meals[day][mealType] = null;
  saveMealPlanWeek(weekId, plan);
}

function clearMealPlan(weekId) {
  const allPlans = getMealPlans();
  delete allPlans[weekId];
  localStorage.setItem('mealPlans', JSON.stringify(allPlans));
}


// ---- GROCERY LISTS ----

function getGroceryLists() {
  const lists = localStorage.getItem('groceryLists');
  if (!lists) return {};
  return JSON.parse(lists);
}

function createGroceryList(name, weekId = null) {
  const allLists = getGroceryLists();
  const listId = `list-${Date.now()}`;

  allLists[listId] = {
    id: listId,
    name: name,
    weekId: weekId,
    items: []
  };

  localStorage.setItem('groceryLists', JSON.stringify(allLists));
  return listId;
}

function getGroceryList(listId) {
  const allLists = getGroceryLists();
  return allLists[listId] || null;
}

// adds item + saves back to localStorage
// TODO: maybe split this into addItem and saveList at some point
function addGroceryItem(listId, itemName, quantity = 1, unit = 'count', category = 'Other', notes = '') {
  const allLists = getGroceryLists();
  const list = allLists[listId];

  if (!list) return false;

  // had to look up how to make a unique id without a library -- Date.now() works fine for this
  const itemId = `item-${Date.now()}`;

  list.items.push({
    id: itemId,
    name: itemName,
    quantity: quantity,
    unit: unit,
    category: category,
    checked: false,
    notes: notes
  });

  localStorage.setItem('groceryLists', JSON.stringify(allLists));
  return itemId;
}

function toggleGroceryItem(listId, itemId) {
  const allLists = getGroceryLists();
  const list = allLists[listId];
  if (!list) return;

  const item = list.items.find(i => i.id === itemId);
  if (item) {
    item.checked = !item.checked;
    localStorage.setItem('groceryLists', JSON.stringify(allLists));
  }
}

function removeGroceryItem(listId, itemId) {
  const allLists = getGroceryLists();
  const list = allLists[listId];
  if (!list) return;

  list.items = list.items.filter(i => i.id !== itemId);
  localStorage.setItem('groceryLists', JSON.stringify(allLists));
}

function clearGroceryList(listId) {
  const allLists = getGroceryLists();
  delete allLists[listId];
  localStorage.setItem('groceryLists', JSON.stringify(allLists));
}

export {
  searchRecipes,
  getRecipeDetails,
  getRandomRecipes,
  getSavedRecipes,
  saveRecipe,
  removeRecipe,
  isRecipeSaved,
  getCurrentWeekId,
  getMealPlanForWeek,
  addMealToDay,
  removeMealFromDay,
  clearMealPlan,
  getGroceryLists,
  createGroceryList,
  getGroceryList,
  addGroceryItem,
  toggleGroceryItem,
  removeGroceryItem,
  clearGroceryList
};
