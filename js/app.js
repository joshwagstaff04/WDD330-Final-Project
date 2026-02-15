// main file
import * as data from './data.js';

let currentView = 'home';

// start everything when page loads
document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('App starting...');
  setupNavigation();
  showView('home');
  loadFeaturedRecipes();
  setupSearchForm();
}

// setup nav clicks
function setupNavigation() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      showView(page);
    });
  });
}

function showView(viewName) {
  console.log('Showing view:', viewName);
  
  // hide everything first
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  
  // then update the nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // show the right one
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
    // TODO: load meal planner
  } else if (viewName === 'grocery') {
    document.getElementById('grocery-view').classList.add('active');
    document.querySelector('[data-page="grocery"]').classList.add('active');
    // TODO: load grocery list
  }
  
  currentView = viewName;
}

// handle search form submit
function setupSearchForm() {
  const form = document.getElementById('recipe-search-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    const filters = {
      diet: document.getElementById('diet-select').value,
      cuisine: document.getElementById('cuisine-select').value,
      maxReadyTime: document.getElementById('max-time').value
    };
    
    console.log('Searching for:', query, filters);
    await searchForRecipes(query, filters);
  });
}

async function searchForRecipes(query, filters) {
  const resultsDiv = document.getElementById('search-results');
  resultsDiv.innerHTML = '<div class="loading">Loading...</div>';
  
  try {
    const results = await data.searchRecipes(query, filters);
    console.log('Got results:', results);
    displayRecipes(results.results, resultsDiv);
  } catch (error) {
    console.error('Search error:', error);
    resultsDiv.innerHTML = '<div class="error">Failed to search recipes. Try again.</div>';
  }
}

async function loadFeaturedRecipes() {
  const featuredDiv = document.getElementById('featured-recipes');
  featuredDiv.innerHTML = '<div class="loading">Loading...</div>';
  
  try {
    const results = await data.getRandomRecipes(6);
    console.log('Got featured recipes');
    displayRecipes(results.recipes, featuredDiv);
  } catch (error) {
    console.error('Featured recipes error:', error);
    featuredDiv.innerHTML = '<div class="error">Could not load featured recipes</div>';
  }
}

function displayRecipes(recipes, container) {
  if (!recipes || recipes.length === 0) {
    container.innerHTML = '<p>No recipes found</p>';
    return;
  }
  
  // build the HTML for each recipe
  const html = recipes.map(recipe => {
    const isSaved = data.isRecipeSaved(recipe.id);
    return `
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
  }).join('');
  
  container.innerHTML = html;
}

// show recipe details page
window.viewRecipe = async function(recipeId) {
  console.log('Viewing recipe:', recipeId);
  
  const detailView = document.getElementById('recipe-view');
  const content = document.getElementById('recipe-detail-content');
  
  // switch to detail view
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  detailView.classList.add('active');
  
  content.innerHTML = '<div class="loading">Loading recipe...</div>';
  
  try {
    const recipe = await data.getRecipeDetails(recipeId);
    console.log('Got recipe:', recipe);
    displayRecipeDetail(recipe, content);
  } catch (error) {
    console.error('Recipe detail error:', error);
    content.innerHTML = '<div class="error">Failed to load recipe</div>';
  }
};

function displayRecipeDetail(recipe, container) {
  const isSaved = data.isRecipeSaved(recipe.id);
  
  // ingredients HTML
  let ingredientsHtml = '';
  if (recipe.extendedIngredients) {
    ingredientsHtml = recipe.extendedIngredients.map(ing => 
      `<li>${ing.amount} ${ing.unit} ${ing.name}</li>`
    ).join('');
  }
  
  // instructions HTML
  let instructionsHtml = '';
  if (recipe.analyzedInstructions && recipe.analyzedInstructions[0]) {
    instructionsHtml = recipe.analyzedInstructions[0].steps.map(step => 
      `<li>${step.step}</li>`
    ).join('');
  }
  
  // nutrition stuff - only show the important ones
  let nutritionHtml = '';
  if (recipe.nutrition && recipe.nutrition.nutrients) {
    const important = ['Calories', 'Fat', 'Carbohydrates', 'Protein'];
    nutritionHtml = recipe.nutrition.nutrients
      .filter(n => important.includes(n.name))
      .map(n => `
        <div class="nutrition-item">
          <div class="nutrition-label">${n.name}</div>
          <div class="nutrition-value">${Math.round(n.amount)}${n.unit}</div>
        </div>
      `).join('');
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

// toggle save button
window.toggleSaveRecipe = async function(recipeId, button) {
  const isSaved = data.isRecipeSaved(recipeId);
  
  if (isSaved) {
    data.removeRecipe(recipeId);
    button.textContent = '🤍 Save';
  } else {
    // get the full recipe to save
    try {
      const recipe = await data.getRecipeDetails(recipeId);
      data.saveRecipe(recipe);
      button.textContent = '❤️ Saved';
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe');
    }
  }
};

function loadSavedRecipes() {
  const saved = data.getSavedRecipes();
  const container = document.getElementById('saved-recipes-content');
  
  if (saved.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No saved recipes yet</p>
        <button class="btn btn-primary" onclick="showView('home')">Search Recipes</button>
      </div>
    `;
    return;
  }
  
  const html = saved.map(recipe => `
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
  `).join('');
  
  container.innerHTML = html;
}

window.removeAndRefresh = function(recipeId) {
  data.removeRecipe(recipeId);
  loadSavedRecipes();
};

// making these global so the HTML onclick can use them
window.showView = showView;
