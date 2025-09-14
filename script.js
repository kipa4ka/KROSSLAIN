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
    renderProducts(getTop100Newest(allProducts)); // Показуємо 100 найновіших
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
    renderProducts(getTop100Newest(allProducts)); // Показуємо 100 найновіших
    scheduleNextUpdate();
  } catch (err) {
    console.error("Помилка завантаження даних:", err);
    if (cached.products && cached.categories) {
      allProducts = cached.products;
      updateCategories(cached.categories);
      renderProducts(getTop100Newest(allProducts));
      alert("Використовуються збережені дані через помилку завантаження.");
    } else {
      localStorage.clear();
      alert("Помилка завантаження даних і немає кешованих даних. Спроба повторного завантаження...");
      fetchData(true);
    }
    scheduleNextUpdate();
  }
}

// Нова функція для отримання 100 найновіших товарів
function getTop100Newest(products) {
  return [...products].sort((a, b) => b.maxId - a.maxId).slice(0, 100);
}

function updateCategories(categories) {
  const categorySelect = document.getElementById("categorySelect");
  categorySelect.innerHTML = '<option value="new">Новинки</option>'; // Лише "Новинки" як перша опція

  const categoryOrder = [
    "Новинки",
    "NIKE чоловічі",
    "NIKE жіночі",
    "ADIDAS чоловічі",
    "ADIDAS жіночі",
    "New Balance чоловічі",
    "New Balance жіночі",
    "ASICS чоловічі",
    "ASICS жіночі",
    "REEBOK чоловічі",
    "REEBOK жіночі",
    "PUMA чоловічі",
    "PUMA жіночі",
    "Salomon чоловічі",
    "Salomon жіночі",
    "HOKA чоловічі",
    "HOKA жіночі",
    "COLUMBIA чоловічі",
    "LACOSTE чоловічі",
    "Balenciaga жіночі",
    "Без бренду",
    "CROCS",
    "Skechers",
    "SALE чоловічі (розпродаж)",
    "SALE жіночі (розпродаж)",
    "Зимові кросівки"
  ];

  const validCategories = categories
    .filter(cat => categoryOrder.includes(cat.name))
    .sort((a, b) => categoryOrder.indexOf(a.name) - categoryOrder.indexOf(b.name));

  validCategories.forEach(cat => {
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

  // Сортуємо продукти: з наявністю зверху, без наявності внизу
  const productsWithStock = [];
  const productsWithoutStock = [];
  products.forEach(product => {
    const hasStock = Object.values(product.sizes).some(inStock => inStock > 0);
    if (hasStock) {
      productsWithStock.push(product);
    } else {
      productsWithoutStock.push(product);
    }
  });

  // Об'єднуємо відсортовані списки
  const sortedProducts = [...productsWithStock, ...productsWithoutStock];

  sortedProducts.forEach(product => {
    if (Object.keys(product.sizes).length === 0) return;

    const productDiv = document.createElement("div");
    productDiv.className = "product";

    let tableHtml = `<table><tr><th>Розмір</th><th>Наявність</th></tr>`; // Залишено лише "Розмір" і "Наявність"
    const sizes = Array.from({ length: 11 }, (_, i) => 36 + i); // Розміри від 36 до 46
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const inStock = product.sizes[size] || 0;
      tableHtml += `<tr ${inStock > 0 ? 'style="background-color: #90ee90;"' : ''}>
        <td>${size}</td><td>${inStock > 0 ? 'Є' : '0'}</td></tr>`; // "Є" для наявності, "0" для відсутності
    }
    tableHtml += "</table>";

    const barcodeDisplay = product.barcode ? product.barcode.replace(/[-_]/g, '').slice(0, 5) : 'Немає';
    const englishName = product.name.split(/[^a-zA-Z0-9\s]/)[0].trim() || product.name;

    productDiv.innerHTML = `
      <div class="product-left"></div>
      <img src="${product.images[0] || ''}" alt="${product.name}" class="product-image">
      <h3>${englishName}</h3>
      ${tableHtml}
      <div class="product-info">
        <p><strong>Артикул:</strong> ${barcodeDisplay}</p>
        <p><strong>Виробник:</strong> ${product.description.match(/Виробник : (.*?)<\/p>/)?.[1] || 'Невідомо'}</p>
        <p><strong>Ціна:</strong> ${product.priceuah} грн</p>
      </div>
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
    filteredProducts = getTop100Newest(allProducts); // Використовуємо 100 найновіших
  } else {
    filteredProducts = allProducts.filter(p => p.categoryId === selected).sort((a, b) => b.maxId - a.maxId);
  }
  renderProducts(filteredProducts);
});

console.log("Розпочато початкове завантаження");
fetchData();

// Функція пошуку
function searchProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allProducts.filter(product => product.name.toLowerCase().includes(searchTerm));
  renderProducts(filtered);
}