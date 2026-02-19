
import * as data from './data.js';

// keeping track of which page we're on
let currentView = 'home';
// holds the recipe currently open in the detail view
let currentRecipe = null;

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

// switching views is just toggling .active on the right section
// some views also reload their data when you open them
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

  try {
    const results = await data.getRandomRecipes(6);
    // random endpoint returns results.recipes not results.results
    displayRecipes(results.recipes, featuredDiv);
  } catch (err) {
    featuredDiv.innerHTML = `
      <div class="error">
        <p>Could not load featured recipes.</p>
        <button class="btn btn-secondary" onclick="loadFeaturedRecipes()">Retry</button>
      </div>
    `;
  }
}

// spoonacular summary comes with HTML tags, so strip it to plain text
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}

// builds recipe cards and puts them in whatever container we pass in
// used for both search results and the featured section
function displayRecipes(recipeList, container) {
  if (!recipeList || recipeList.length === 0) {
    container.innerHTML = '<p>No recipes found</p>';
    return;
  }

  // build a set of saved IDs once instead of hitting localStorage for every card
  const savedIds = new Set();
  const savedRecipes = data.getSavedRecipes();
  for (let i = 0; i < savedRecipes.length; i++) {
    savedIds.add(savedRecipes[i].id);
  }

  // build the HTML as a string and dump it into the container once at the end
  let html = '';

  for (let i = 0; i < recipeList.length; i++) {
    const recipe = recipeList[i];
    const isSaved = savedIds.has(recipe.id);

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

// when user clicks View on a recipe card this will show the full detail page
window.viewRecipe = async function(recipeId) {
  const detailView = document.getElementById('recipe-view');
  const content = document.getElementById('recipe-detail-content');

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  detailView.classList.add('active');

  content.innerHTML = '<div class="loading">Loading recipe...</div>';

  try {
    // try saved recipes first ()already has full data), otherwise fetch from API
    const saved = data.getSavedRecipes();
    const fromSaved = saved.find(r => r.id === recipeId);
    const recipeData = fromSaved || await data.getRecipeDetails(recipeId);
    displayRecipeDetail(recipeData, content);
  } catch (err) {
    content.innerHTML = '<div class="error">Failed to load recipe</div>';
  }
};

// builds the recipe detail page (ingredients, steps, nutrition)
function displayRecipeDetail(recipe, container) {
  // keep this around so the Save button can use the full object without refetching
  currentRecipe = recipe;
  window.currentRecipe = recipe;
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
        <button class="btn btn-primary" onclick="toggleSaveRecipe(${recipe.id}, this, currentRecipe)">
          ${isSaved ? '❤️ Saved' : '🤍 Save Recipe'}
        </button>
      </div>
      
      ${recipe.summary ? `<div class="recipe-summary">${stripHtml(recipe.summary)}</div>` : ''}
      
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
// recipeData is passed in from the card/detail context so we never need an extra fetch
window.toggleSaveRecipe = async function(recipeId, button, recipeData = null) {
  const alreadySaved = data.isRecipeSaved(recipeId);

  if (alreadySaved) {
    data.removeRecipe(recipeId);
    button.textContent = '🤍 Save';
  } else {
    try {
      // use passed-in data if available, otherwise fetch (e.g. called from search card)
      const fullData = recipeData || await data.getRecipeDetails(recipeId);
      data.saveRecipe(fullData);
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
  const monthId = data.getCurrentMonthId();
  const plan = data.getMealPlanForWeek(monthId);

  displayMealPlanner(plan, monthId);

  document.getElementById('generate-grocery-btn').onclick = () => generateGroceryFromMealPlan(monthId);

  document.getElementById('clear-plan-btn').onclick = () => {
    if (confirm('Clear all meals for this week?')) {
      data.clearMealPlan(monthId);
      loadMealPlanner();
    }
  };
}

function displayMealPlanner(plan, monthId) {
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
              </div>
            ` : '<small>recipe not found</small>'}
            <div class="meal-actions">
              <button class="btn-small" onclick="removeMealFromPlanner('${monthId}', '${day}', '${mealType}')">Remove</button>
              <button class="btn-small" onclick="openRecipeSelector('${monthId}', '${day}', '${mealType}')">Change</button>
            </div>
          </div>
        `;
      } else {
        mealsHtml += `
          <div class="meal-slot empty">
            <div class="meal-type">${label}</div>
            <button class="btn-small" onclick="openRecipeSelector('${monthId}', '${day}', '${mealType}')">+ Add Recipe</button>
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

window.removeMealFromPlanner = function(monthId, day, mealType) {
  data.removeMealFromDay(monthId, day, mealType);
  loadMealPlanner();
};

window.openRecipeSelector = function(monthId, day, mealType) {
  const saved = data.getSavedRecipes();

  if (saved.length === 0) {
    alert('Save some recipes first! Search for recipes on the Home page.');
    return;
  }

  // build modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  let recipesHtml = '';
  for (let i = 0; i < saved.length; i++) {
    const r = saved[i];
    recipesHtml += `
      <div class="recipe-option" data-idx="${i}">
        ${r.image ? `<img src="${r.image}" alt="${r.title}">` : ''}
        <span class="recipe-option-title">${r.title}</span>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="modal">
      <h2>Add to ${day} – ${mealType[0].toUpperCase() + mealType.slice(1)}</h2>
      <div id="recipe-option-list">${recipesHtml}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // close on cancel or backdrop click
  overlay.querySelector('#modal-cancel-btn').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  // select a recipe
  overlay.querySelectorAll('.recipe-option').forEach(el => {
    el.addEventListener('click', () => {
      const recipe = saved[parseInt(el.dataset.idx)];
      data.addMealToDay(monthId, day, mealType, recipe.id);
      overlay.remove();
      loadMealPlanner();
    });
  });
};

// Fetches ingredients from every recipe in the meal plan,
// merges duplicate ingredients (same name + unit), then builds a grocery list
async function generateGroceryFromMealPlan(monthId) {
  const plan = data.getMealPlanForWeek(monthId);

  // collect unique recipe IDs (same recipe might be used multiple days)
  const recipeIds = new Set();
  const days = Object.keys(plan.meals);
  for (let i = 0; i < days.length; i++) {
    const dayMeals = plan.meals[days[i]];
    const mealTypes = Object.keys(dayMeals);
    for (let j = 0; j < mealTypes.length; j++) {
      const meal = dayMeals[mealTypes[j]];
      if (meal && meal.recipeId) recipeIds.add(meal.recipeId);
    }
  }

  if (recipeIds.size === 0) {
    alert('Add some meals to your plan first!');
    return;
  }

  const btn = document.getElementById('generate-grocery-btn');
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    // use saved recipe data first -- if already saved we have extendedIngredients, no fetch needed
    const recipeIdList = Array.from(recipeIds);
    const alreadySaved = data.getSavedRecipes();
    const recipeDetails = [];
    for (let i = 0; i < recipeIdList.length; i++) {
      let found = null;
      for (let j = 0; j < alreadySaved.length; j++) {
        if (alreadySaved[j].id === recipeIdList[i] && alreadySaved[j].extendedIngredients) {
          found = alreadySaved[j];
          break;
        }
      }
      if (found) {
        recipeDetails.push(found);
      } else {
        const details = await data.getRecipeDetails(recipeIdList[i]);
        recipeDetails.push(details);
      }
    }

    // build a map to merge duplicate ingredients
    const merged = {};

    for (let i = 0; i < recipeDetails.length; i++) {
      const recipe = recipeDetails[i];
      if (!recipe.extendedIngredients) continue;
      for (let j = 0; j < recipe.extendedIngredients.length; j++) {
        const ing = recipe.extendedIngredients[j];
        const name = ing.name.trim().toLowerCase();

        // safely get unit — measures.us may not always exist
        let unit = '';
        if (ing.measures && ing.measures.us && ing.measures.us.unitShort) {
          unit = ing.measures.us.unitShort.toLowerCase();
        } else if (ing.unit) {
          unit = ing.unit.toLowerCase();
        }

        // safely get amount
        let amount = 1;
        if (ing.measures && ing.measures.us && ing.measures.us.amount) {
          amount = ing.measures.us.amount;
        } else if (ing.amount) {
          amount = ing.amount;
        }

        // merge duplicates -- key is name + unit so e.g. two entries for butter_tbsp get combined
        const key = name + '_' + unit;
        if (merged[key]) {
          merged[key].amount += amount;
        } else {
          merged[key] = { name: name, amount: amount, unit: unit };
        }
      }
    }

    // clear existing items and rebuild fresh
    data.clearGroceryItems();

    const mergedKeys = Object.keys(merged);
    for (let i = 0; i < mergedKeys.length; i++) {
      const item = merged[mergedKeys[i]];
      data.addGroceryItem(item.name, item.amount, item.unit);
    }

    showView('grocery');
    btn.textContent = 'Generate Grocery List';
    btn.disabled = false;
  } catch (err) {
    console.error('grocery generation failed:', err);
    alert('Could not generate list — check your connection and try again.');
    btn.textContent = 'Generate Grocery List';
    btn.disabled = false;
  }
}

// ------ GROCERY LIST ------

function loadGroceryList() {
  displayGroceryList();
  setupGroceryListForm();

  document.getElementById('clear-grocery-btn').onclick = () => {
    if (confirm('Clear grocery list?')) {
      data.clearGroceryItems();
      displayGroceryList();
    }
  };

  document.getElementById('uncheck-all-btn').onclick = () => {
    const items = data.getGroceryItems();
    for (let i = 0; i < items.length; i++) {
      items[i].checked = false;
    }
    data.saveGroceryItems(items);
    displayGroceryList();
  };
}

function displayGroceryList() {
  const container = document.getElementById('grocery-list-content');
  const items = data.getGroceryItems();

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No items yet.</p><p>Add some below or generate from your meal plan.</p></div>';
    return;
  }

  let html = '';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const amt = item.amount ? (Math.round(item.amount * 10) / 10) : null;
    const unit = item.unit ? item.unit : '';
    const label = amt ? `${amt}${unit ? ' ' + unit : ''} ${item.name}` : item.name;
    html += `
      <div class="grocery-item ${item.checked ? 'checked' : ''}">
        <input
          type="checkbox"
          ${item.checked ? 'checked' : ''}
          onchange="toggleGroceryItem('${item.id}')"
        >
        <span class="item-name">${label}</span>
        <button class="btn-small" onclick="lookupFood('${item.id}', '${item.name}')">Look up</button>
        <button class="btn-small" onclick="removeGroceryItemFromList('${item.id}')">✕</button>
      </div>
      <div class="food-lookup hidden" id="lookup-${item.id}"></div>
    `;
  }

  container.innerHTML = html;
}

window.toggleGroceryItem = function(itemId) {
  data.toggleGroceryItem(itemId);
  displayGroceryList();
};

window.removeGroceryItemFromList = function(itemId) {
  data.removeGroceryItem(itemId);
  displayGroceryList();
};

// "Look up" toggles a small info panel under the grocery item
// pulls basic nutrition info from Open Food Facts (no API key needed)
window.lookupFood = async function(itemId, itemName) {
  const panel = document.getElementById('lookup-' + itemId);

  // toggle if already loaded
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    return;
  }

  panel.classList.remove('hidden');
  panel.innerHTML = '<em>Looking up...</em>';

  try {
    const results = await data.searchFood(itemName);

    if (!results.products || results.products.length === 0) {
      panel.innerHTML = '<em>No products found.</em>';
      return;
    }

    const p = results.products[0];
    const name = p.product_name || itemName;
    const kcal = p.nutriments && p.nutriments['energy-kcal_100g']
      ? Math.round(p.nutriments['energy-kcal_100g']) + ' kcal / 100g'
      : null;
    const grade = p.nutrition_grade_fr ? p.nutrition_grade_fr.toUpperCase() : null;

    let html = '<strong>' + name + '</strong>';
    if (kcal) html += ' &nbsp;·&nbsp; Calories: ' + kcal;
    if (grade) html += ' &nbsp;·&nbsp; Grade: ' + grade;
    panel.innerHTML = html;
  } catch (err) {
    panel.innerHTML = '<em>Lookup failed — check your connection.</em>';
  }
};

function setupGroceryListForm() {
  const form = document.getElementById('add-grocery-form');

  form.onsubmit = (e) => {
    e.preventDefault();
    const itemName = document.getElementById('grocery-item-input').value.trim();
    if (!itemName) return;
    data.addGroceryItem(itemName);
    form.reset();
    displayGroceryList();
  };
}

// need these on window so the onclick attributes in the HTML can reach them
window.showView = showView;
window.loadFeaturedRecipes = loadFeaturedRecipes;
