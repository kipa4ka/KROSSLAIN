const backendUrl = 'https://krosslain-server.onrender.com/api/products'; // Переконайся, що URL правильний
let allProducts = [];

function getLastUpdateTime() {
  return parseInt(localStorage.getItem('lastUpdateTime') || '0');
}

function saveDataToStorage(products, categories) {
  try {
    if (products && products.length > 0 && categories && categories.length > 0) {
      localStorage.setItem('cachedProducts', JSON.stringify(products));
      localStorage.setItem('cachedCategories', JSON.stringify(categories));
      localStorage.setItem('lastUpdateTime', Date.now().toString());
      console.log("Збережено:", products.length, "товарів і", categories.length, "категорій");
    } else {
      console.warn("Порожній список товарів або категорій, не зберігаю");
    }
  } catch (e) {
    console.error("Помилка збереження:", e);
  }
}

function getCachedProducts() {
  try {
    const cached = localStorage.getItem('cachedProducts');
    const cachedCats = localStorage.getItem('cachedCategories');
    return { products: cached ? JSON.parse(cached) : null, categories: cachedCats ? JSON.parse(cachedCats) : null };
  } catch (e) {
    console.error("Помилка читання з localStorage:", e);
    return { products: null, categories: null };
  }
}

async function fetchData(forceFetch = false) {
  const updateInterval = 15 * 60 * 1000; // 15 хвилин
  const lastUpdate = getLastUpdateTime();
  const now = Date.now();
  const cached = getCachedProducts();

  if (!forceFetch && cached.products && cached.categories && (now - lastUpdate < updateInterval)) {
    console.log("Використовуємо кеш:", cached.products.length, "товарів і", cached.categories.length, "категорій");
    allProducts = cached.products;
    renderProducts(allProducts.slice(0, 100).sort((a, b) => b.maxId - a.maxId));
    updateCategories(cached.categories);
    scheduleNextUpdate();
    return;
  }

  console.log("Завантажуємо з бекенду...");
  try {
    const response = await fetch(backendUrl);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    console.log("Отримані дані:", data);

    const categorySelect = document.getElementById("categorySelect");
    updateCategories(data.categories || []);
    allProducts = data.items || [];
    console.log(`Знайдено товарів: ${allProducts.length}, категорій: ${data.categories?.length || 0}`);
    saveDataToStorage(allProducts, data.categories || []);
    renderProducts(allProducts.slice(0, 100).sort((a, b) => b.maxId - a.maxId));
    scheduleNextUpdate();
  } catch (err) {
    console.error("Помилка завантаження даних:", err);
    if (cached.products && cached.categories) {
      allProducts = cached.products;
      updateCategories(cached.categories);
      renderProducts(allProducts.slice(0, 100).sort((a, b) => b.maxId - a.maxId));
      alert("Використовуються збережені дані через помилку завантаження.");
    } else {
      localStorage.clear();
      alert("Помилка завантаження даних і немає кешованих даних. Спроба повторного завантаження...");
      fetchData(true);
    }
    scheduleNextUpdate();
  }
}

function updateCategories(categories) {
  const categorySelect = document.getElementById("categorySelect");
  categorySelect.innerHTML = '<option value="all">Всі</option><option value="new">Новинки</option>';
  (categories || []).forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    categorySelect.appendChild(option);
  });
}

function scheduleNextUpdate() {
  const updateInterval = 15 * 60 * 1000;
  setTimeout(() => {
    console.log("Виконується заплановане оновлення даних");
    fetchData(true);
  }, updateInterval);
}

function renderProducts(products) {
  const container = document.getElementById("products");
  const lastUpdateDisplay = document.getElementById("lastUpdate");
  const lastUpdate = getLastUpdateTime();
  lastUpdateDisplay.textContent = lastUpdate ? new Date(lastUpdate).toLocaleString() : "Ніколи";
  container.innerHTML = "";

  products.forEach(product => {
    if (Object.keys(product.sizes).length === 0) return;

    const productDiv = document.createElement("div");
    productDiv.className = "product";

    let tableHtml = `<table><tr><th>Розмір</th><th>Довжина (см)</th><th>Наявність</th></tr>`;
    const lengths = [22.5, 23.5, 24.0, 25.0, 25.5, 26.0, 26.5, 27.5, 28.0, 28.5, 29.0];
    for (let i = 0; i < lengths.length; i++) {
      const size = 36 + i;
      const inStock = product.sizes[size] || 0;
      const length = lengths[i];
      tableHtml += `<tr ${inStock > 0 ? 'style="background-color: #90ee90;"' : ''}>
        <td>${size}</td><td>${length}</td><td>${inStock}</td></tr>`;
    }
    tableHtml += "</table>";

    productDiv.innerHTML = `
      <img src="${product.images[0] || ''}" alt="${product.name}" class="product-image">
      <h3>${product.name}</h3>
      <p>Ціна: ${product.priceuah} грн</p>
      <p>Виробник: ${product.description.match(/Виробник : (.*?)<\/p>/)?.[1] || 'Невідомо'}</p>
      ${tableHtml}
    `;
    container.appendChild(productDiv);
  });

  console.log(`Відображено товарів: ${container.children.length}`);
}

document.getElementById("categorySelect").addEventListener("change", function() {
  const selected = this.value;
  console.log(`Вибрано категорію: ${selected}`);
  let filteredProducts = allProducts;
  if (selected === "new") {
    filteredProducts = allProducts.slice(0, 100).sort((a, b) => b.maxId - a.maxId);
  } else if (selected !== "all") {
    filteredProducts = allProducts.filter(p => p.categoryId === selected).sort((a, b) => b.maxId - a.maxId);
  } else {
    filteredProducts = allProducts.sort((a, b) => b.maxId - a.maxId);
  }
  renderProducts(filteredProducts);
});

console.log("Розпочато початкове завантаження");
fetchData();