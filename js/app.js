// app.js
// this is the main file -- handles all the UI stuff and connects to data.js
// basically everything that touches the DOM lives here

import * as data from './data.js';

// keeping track of which page we're on
let currentView = 'home';

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('app loaded');
  setupNavigation();
  showView('home');
  loadFeaturedRecipes();
  setupSearchForm();
}

// attach click listeners to all the nav links
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      showView(page);
    });
  });
}

// show a specific view and hide the rest
// also loads the data for that page if needed
function showView(viewName) {
  // hide all views first
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  if (viewName === 'home') {
    document.getElementById('home-view').classList.add('active');
    document.querySelector('[data-page="home"]').classList.add('active');
  } else if (viewName === 'saved') {
    document.getElementById('saved-view').classList.add('active');
    document.querySelector('[data-page="saved"]').classList.add('active');
    loadSavedRecipes();
  } else if (viewName === 'planner') {
    document.getElementById('planner-view').classList.add('active');
    document.querySelector('[data-page="planner"]').classList.add('active');
    loadMealPlanner();
  } else if (viewName === 'grocery') {
    document.getElementById('grocery-view').classList.add('active');
    document.querySelector('[data-page="grocery"]').classList.add('active');
    loadGroceryList();
  }

  currentView = viewName;
}

function setupSearchForm() {
  const form = document.getElementById('recipe-search-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    // grab whatever filters the user set
    const filters = {
      diet: document.getElementById('diet-select').value,
      cuisine: document.getElementById('cuisine-select').value,
      maxReadyTime: document.getElementById('max-time').value
    };

    await searchForRecipes(query, filters);
  });
}

async function searchForRecipes(query, filters) {
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  try {
    const results = await data.searchRecipes(query, filters);
    // results.results is where the actual array is -- the API wraps it
    displayRecipes(results.results, resultsDiv);
  } catch (err) {
    console.error('search broke:', err);
    resultsDiv.innerHTML = '<div class="error">Search failed. Check your connection and try again.</div>';
  }
}

async function loadFeaturedRecipes() {
  const featuredDiv = document.getElementById('featured-recipes');
  featuredDiv.innerHTML = '<div class="loading">Loading...</div>';

  // not wrapping this in try/catch for now, if it fails the loading div just stays
  const results = await data.getRandomRecipes(6);
  // random endpoint returns results.recipes not results.results -- kept mixing these up
  if (!results) return;
  displayRecipes(results.recipes, featuredDiv);
}

// builds recipe cards and puts them in whatever container we pass in
// used for both search results and featured section on homepage
function displayRecipes(recipeList, container) {
  if (!recipeList || recipeList.length === 0) {
    container.innerHTML = '<p>No recipes found</p>';
    return;
  }

  let html = '';

  for (let i = 0; i < recipeList.length; i++) {
    const recipe = recipeList[i];
    const isSaved = data.isRecipeSaved(recipe.id);

    html += `
      <div class="recipe-card">
        <img src="${recipe.image}" alt="${recipe.title}" class="recipe-card-image">
        <div class="recipe-card-content">
          <h3 class="recipe-card-title">${recipe.title}</h3>
          <div class="recipe-card-meta">
            ${recipe.readyInMinutes ? `<span>⏱️ ${recipe.readyInMinutes} min</span>` : ''}
            ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
          </div>
          <div class="recipe-card-actions">
            <button class="btn btn-primary" onclick="viewRecipe(${recipe.id})">View</button>
            <button class="btn btn-secondary" onclick="toggleSaveRecipe(${recipe.id}, this)">
              ${isSaved ? '❤️ Saved' : '🤍 Save'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// when user clicks View on a recipe card, show the full detail page
window.viewRecipe = async function(recipeId) {
  const detailView = document.getElementById('recipe-view');
  const content = document.getElementById('recipe-detail-content');

  // hide all views and show the detail one
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  detailView.classList.add('active');

  content.innerHTML = '<div class="loading">Loading recipe...</div>';

  try {
    const recipeData = await data.getRecipeDetails(recipeId);
    displayRecipeDetail(recipeData, content);
  } catch (err) {
    content.innerHTML = '<div class="error">Failed to load recipe</div>';
  }
};

// builds the full recipe detail page -- ingredients, steps, nutrition
// this function is doing a lot but I didn't want to split it up yet
function displayRecipeDetail(recipe, container) {
  const isSaved = data.isRecipeSaved(recipe.id);

  // build ingredients list
  let ingredientsHtml = '';
  if (recipe.extendedIngredients) {
    for (let i = 0; i < recipe.extendedIngredients.length; i++) {
      const ing = recipe.extendedIngredients[i];
      ingredientsHtml += `<li>${ing.amount} ${ing.unit} ${ing.name}</li>`;
    }
  }

  // instructions -- had to look this up, the API returns an array so we need [0]
  let instructionsHtml = '';
  if (recipe.analyzedInstructions && recipe.analyzedInstructions[0]) {
    const steps = recipe.analyzedInstructions[0].steps;
    for (let i = 0; i < steps.length; i++) {
      instructionsHtml += `<li>${steps[i].step}</li>`;
    }
  }

  // only show calories, fat, carbs, protein -- dont need all 50+ nutrients
  let nutritionHtml = '';
  if (recipe.nutrition && recipe.nutrition.nutrients) {
    const wanted = ['Calories', 'Fat', 'Carbohydrates', 'Protein'];
    for (let i = 0; i < recipe.nutrition.nutrients.length; i++) {
      const n = recipe.nutrition.nutrients[i];
      if (wanted.includes(n.name)) {
        nutritionHtml += `
          <div class="nutrition-item">
            <div class="nutrition-label">${n.name}</div>
            <div class="nutrition-value">${Math.round(n.amount)}${n.unit}</div>
          </div>
        `;
      }
    }
  }
  
  container.innerHTML = `
    <div class="recipe-detail">
      <button class="btn btn-secondary" onclick="showView('home')">← Back</button>
      
      <h1>${recipe.title}</h1>
      <img src="${recipe.image}" alt="${recipe.title}" class="recipe-detail-image">
      
      <div class="recipe-detail-meta">
        ${recipe.readyInMinutes ? `<span>⏱️ ${recipe.readyInMinutes} minutes</span>` : ''}
        ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
      </div>
      
      <div class="recipe-detail-actions">
        <button class="btn btn-primary" onclick="toggleSaveRecipe(${recipe.id}, this)">
          ${isSaved ? '❤️ Saved' : '🤍 Save Recipe'}
        </button>
      </div>
      
      ${recipe.summary ? `<div class="recipe-summary">${recipe.summary}</div>` : ''}
      
      <div class="recipe-ingredients">
        <h2>Ingredients</h2>
        <ul class="ingredients-list">${ingredientsHtml}</ul>
      </div>
      
      ${instructionsHtml ? `
        <div class="recipe-instructions">
          <h2>Instructions</h2>
          <ol class="instructions-list">${instructionsHtml}</ol>
        </div>
      ` : ''}
      
      ${nutritionHtml ? `
        <div class="recipe-nutrition">
          <h2>Nutrition (per serving)</h2>
          <div class="nutrition-grid">${nutritionHtml}</div>
        </div>
      ` : ''}
    </div>
  `;
}

// handles both saving and unsaving -- toggles based on current state
window.toggleSaveRecipe = async function(recipeId, button) {
  const alreadySaved = data.isRecipeSaved(recipeId);

  if (alreadySaved) {
    data.removeRecipe(recipeId);
    button.textContent = '🤍 Save';
  } else {
    // need to fetch the full recipe before we can save it
    try {
      const recipeData = await data.getRecipeDetails(recipeId);
      data.saveRecipe(recipeData);
      button.textContent = '❤️ Saved';
    } catch (err) {
      alert('Could not save recipe, try again');
    }
  }
};

function loadSavedRecipes() {
  const savedRecipes = data.getSavedRecipes();
  const container = document.getElementById('saved-recipes-content');

  if (savedRecipes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No saved recipes yet</p>
        <button class="btn btn-primary" onclick="showView('home')">Search Recipes</button>
      </div>
    `;
    return;
  }

  let html = '';
  for (let i = 0; i < savedRecipes.length; i++) {
    const recipe = savedRecipes[i];
    html += `
      <div class="recipe-card">
        <img src="${recipe.image}" alt="${recipe.title}" class="recipe-card-image">
        <div class="recipe-card-content">
          <h3 class="recipe-card-title">${recipe.title}</h3>
          <div class="recipe-card-meta">
            ${recipe.readyInMinutes ? `<span>⏱️ ${recipe.readyInMinutes} min</span>` : ''}
            ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
          </div>
          <div class="recipe-card-actions">
            <button class="btn btn-primary" onclick="viewRecipe(${recipe.id})">View</button>
            <button class="btn btn-secondary" onclick="removeAndRefresh(${recipe.id})">Remove</button>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

window.removeAndRefresh = function(recipeId) {
  data.removeRecipe(recipeId);
  loadSavedRecipes(); // just reload the whole list, easier than trying to remove one card
};

// ------ MEAL PLANNER ------

function loadMealPlanner() {
  const weekId = data.getCurrentWeekId();
  const plan = data.getMealPlanForWeek(weekId);

  displayMealPlanner(plan, weekId);

  document.getElementById('generate-grocery-btn').onclick = () => generateGroceryFromMealPlan(weekId);

  document.getElementById('clear-plan-btn').onclick = () => {
    if (confirm('Clear all meals for this week?')) {
      data.clearMealPlan(weekId);
      loadMealPlanner();
    }
  };
}

function displayMealPlanner(plan, weekId) {
  const grid = document.getElementById('meal-planner-grid');
  const days = Object.keys(plan.meals);
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const savedRecipes = data.getSavedRecipes();

  let html = '';

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const dayMeals = plan.meals[day];
    let mealsHtml = '';

    for (let j = 0; j < mealTypes.length; j++) {
      const mealType = mealTypes[j];
      const meal = dayMeals[mealType];

      // capitalize the label -- breakfast -> Breakfast etc
      const label = mealType[0].toUpperCase() + mealType.slice(1);

      if (meal && meal.recipeId) {
        const recipe = savedRecipes.find(r => r.id === meal.recipeId);
        mealsHtml += `
          <div class="meal-slot assigned">
            <div class="meal-type">${label}</div>
            ${recipe ? `
              <div class="meal-recipe">
                <strong>${recipe.title}</strong>
                <small>${meal.servings} servings</small>
              </div>
            ` : '<small>recipe not found</small>'}
            <div class="meal-actions">
              <button class="btn-small" onclick="removeMealFromPlanner('${weekId}', '${day}', '${mealType}')">Remove</button>
              <button class="btn-small" onclick="openRecipeSelector('${weekId}', '${day}', '${mealType}')">Change</button>
            </div>
          </div>
        `;
      } else {
        mealsHtml += `
          <div class="meal-slot empty">
            <div class="meal-type">${label}</div>
            <button class="btn-small" onclick="openRecipeSelector('${weekId}', '${day}', '${mealType}')">+ Add Recipe</button>
          </div>
        `;
      }
    }

    html += `
      <div class="day-card">
        <h3 class="day-name">${day}</h3>
        <div class="meals-container">${mealsHtml}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

window.removeMealFromPlanner = function(weekId, day, mealType) {
  data.removeMealFromDay(weekId, day, mealType);
  loadMealPlanner();
};

window.openRecipeSelector = function(weekId, day, mealType) {
  // show a dialog to pick a recipe
  const saved = data.getSavedRecipes();
  
  if (saved.length === 0) {
    alert('You need to save some recipes first! Go to Home and search for recipes to save.');
    return;
  }
  
  // this is a quick approach - just build a simple modal from a prompt for now
  // a real modal would be nicer but this works for a student project
  const recipeList = saved
    .map((r, idx) => `${idx + 1}. ${r.title}`)
    .join('\n');
  
  const choice = prompt(`Select a recipe:\n\n${recipeList}\n\nEnter the recipe number (or cancel to skip):`);
  
  if (choice) {
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < saved.length) {
      const recipe = saved[idx];
      data.addMealToDay(weekId, day, mealType, recipe.id, 4);
      loadMealPlanner();
    } else {
      alert('Invalid selection');
    }
  }
};

// TODO: this should actually pull ingredients from each recipe
// right now it just creates an empty list 
function generateGroceryFromMealPlan(weekId) {
  const plan = data.getMealPlanForWeek(weekId);

  // check if there's actually anything planned
  let hasMeals = false;
  const days = Object.values(plan.meals);
  for (let i = 0; i < days.length; i++) {
    const meals = Object.values(days[i]);
    for (let j = 0; j < meals.length; j++) {
      if (meals[j] && meals[j].recipeId) {
        hasMeals = true;
      }
    }
  }

  if (!hasMeals) {
    alert('Add some meals to your plan first!');
    return;
  }

  const listId = data.createGroceryList('Weekly Grocery List', weekId);
  data.addGroceryItem(listId, 'List created from meal plan -- add your items below', 1, 'count', 'Note');

  showView('grocery');
}

// ------ GROCERY LIST ------

function loadGroceryList() {
  const allLists = data.getGroceryLists();
  const listKeys = Object.keys(allLists);

  if (listKeys.length === 0) {
    document.getElementById('grocery-list-content').innerHTML = `
      <div class="empty-state">
        <p>No grocery lists yet</p>
        <p>Add items below or generate one from your meal plan</p>
      </div>
    `;
    setupGroceryListForm();
    return;
  }

  // just show the most recent list for now
  // TODO: let user switch between lists
  const listId = listKeys[listKeys.length - 1];
  const currentList = allLists[listId];

  displayGroceryList(currentList);
  setupGroceryListForm();

  document.getElementById('clear-grocery-btn').onclick = () => {
    if (confirm('Delete this grocery list?')) {
      data.clearGroceryList(listId);
      loadGroceryList();
    }
  };

  document.getElementById('uncheck-all-btn').onclick = () => {
    // uncheck everything so you can reuse the list
    currentList.items.forEach(item => item.checked = false);
    displayGroceryList(currentList);
  };
}

function displayGroceryList(list) {
  const container = document.getElementById('grocery-list-content');
  
  if (list.items.length === 0) {
    container.innerHTML = '<p>No items in this list yet</p>';
    return;
  }
  
  // group items by category
  const byCategory = {};
  for (let i = 0; i < list.items.length; i++) {
    const item = list.items[i];
    if (!byCategory[item.category]) {
      byCategory[item.category] = [];
    }
    byCategory[item.category].push(item);
  }

  // build HTML for each category group
  let html = '';
  for (const category in byCategory) {
    const items = byCategory[category];
    let itemsHtml = '';
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      itemsHtml += `
        <div class="grocery-item ${item.checked ? 'checked' : ''}">
          <input 
            type="checkbox" 
            ${item.checked ? 'checked' : ''} 
            onchange="toggleGroceryItem('${list.id}', '${item.id}')"
          >
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity} ${item.unit}</span>
          ${item.notes ? `<span class="item-notes">${item.notes}</span>` : ''}
          <button class="btn-small" onclick="removeGroceryItemFromList('${list.id}', '${item.id}')">✕</button>
        </div>
      `;
    }
    html += `
      <div class="category-section">
        <h3>${category}</h3>
        <div class="items-list">${itemsHtml}</div>
      </div>
    `;
  }

  container.innerHTML = html;
}

window.toggleGroceryItem = function(listId, itemId) {
  data.toggleGroceryItem(listId, itemId);
  const list = data.getGroceryList(listId);
  displayGroceryList(list);
};

window.removeGroceryItemFromList = function(listId, itemId) {
  data.removeGroceryItem(listId, itemId);
  const list = data.getGroceryList(listId);
  displayGroceryList(list);
};

// sets up the add item form -- creates a new list if there isn't one yet
function setupGroceryListForm() {
  const form = document.getElementById('add-grocery-form');

  // get existing list or make a new one
  const allLists = data.getGroceryLists();
  const listKeys = Object.keys(allLists);
  let listId;
  if (listKeys.length > 0) {
    listId = listKeys[listKeys.length - 1];
  } else {
    listId = data.createGroceryList('Shopping List');
  }

  form.onsubmit = (e) => {
    e.preventDefault();

    const itemName = document.getElementById('grocery-item-input').value.trim();
    const aisle = document.getElementById('grocery-aisle-input').value.trim();

    if (!itemName) return;

    data.addGroceryItem(listId, itemName, 1, 'count', aisle || 'Other');
    form.reset();

    // re-render the list with the new item
    const updatedList = data.getGroceryList(listId);
    displayGroceryList(updatedList);
  };
}

// need these on window so the onclick attributes in the HTML can reach them
window.showView = showView;
