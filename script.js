const xmlUrl = "https://easydrop.one/prom-export?key=24481682017071&pid=32494472342744";
let allProducts = [];

// Функція для отримання часу останнього оновлення з localStorage
function getLastUpdateTime() {
  return parseInt(localStorage.getItem('lastUpdateTime') || '0');
}

// Функція для збереження даних у localStorage
function saveDataToStorage(products) {
  try {
    if (products && products.length > 0) {
      localStorage.setItem('cachedProducts', JSON.stringify(products));
      localStorage.setItem('lastUpdateTime', Date.now().toString());
      console.log("Дані успішно збережено в localStorage");
    } else {
      console.warn("Не збережено в localStorage: список товарів порожній");
    }
  } catch (e) {
    console.error("Помилка збереження в localStorage:", e);
  }
}

// Функція для отримання кешованих даних
function getCachedProducts() {
  try {
    const cached = localStorage.getItem('cachedProducts');
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error("Помилка читання з localStorage:", e);
    return null;
  }
}

// Функція для завантаження даних з XML
function fetchXmlData(forceFetch = false) {
  const updateInterval = 3 * 60 * 1000; // 3 хвилини
  const lastUpdate = getLastUpdateTime();
  const now = Date.now();
  const cachedProducts = getCachedProducts();

  if (!forceFetch && cachedProducts && (now - lastUpdate < updateInterval)) {
    console.log("Використовуються свіжі кешовані дані");
    allProducts = cachedProducts;
    const newProducts = allProducts.slice(0, 100);
    renderProducts(newProducts);
    scheduleNextUpdate();
    return;
  }

  console.log("Розпочато завантаження даних з API");
  fetch(xmlUrl)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.text();
    })
    .then(str => {
      console.log("Отримано XML-відповідь:", str.substring(0, 200)); // Логуємо початок XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(str, "application/xml");

      // Перевірка на помилки парсингу XML
      if (xml.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Помилка парсингу XML");
      }

      // Завантаження категорій
      const categories = xml.getElementsByTagName("category");
      const categorySelect = document.getElementById("categorySelect");
      console.log(`Знайдено категорій у XML: ${categories.length}`);

      // Очищаємо select і додаємо опцію "Новинки"
      categorySelect.innerHTML = '<option value="new">Новинки</option>';
      let categoriesAdded = 0;
      for (let category of categories) {
        const id = category.getAttribute("id");
        const name = category.textContent.trim();
        if (id && name) {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = name;
          categorySelect.appendChild(option);
          console.log(`Додано категорію: ID=${id}, Назва=${name}`);
          categoriesAdded++;
        } else {
          console.warn(`Пропущено категорію: ID=${id}, Назва=${name}`);
        }
      }
      if (categoriesAdded === 0) {
        console.warn("Попередження: жодної категорії не додано до select");
        localStorage.clear(); // Очищаємо кеш, якщо категорії відсутні
      }

      // Завантаження товарів
      const items = xml.getElementsByTagName("item");
      const productsByGroup = {};
      console.log(`Знайдено елементів: ${items.length}`);
      for (let item of items) {
        const groupId = item.getAttribute("group_id");
        const available = item.getAttribute("available") === "true";
        if (!productsByGroup[groupId] && available) {
          productsByGroup[groupId] = {
            id: item.getAttribute("id"),
            groupId: groupId,
            categoryId: item.getElementsByTagName("categoryId")[0]?.textContent,
            name: item.getElementsByTagName("name")[0]?.textContent || "Без назви",
            price: item.getElementsByTagName("priceuah")[0]?.textContent || "N/A",
            desc: item.getElementsByTagName("description")[0]?.textContent || "",
            images: Array.from(item.getElementsByTagName("image")).map(img => img.textContent),
            sizes: {}
          };
        }
        if (available) {
          const size = parseInt(item.getElementsByTagName("param")[0]?.textContent.match(/\d+/)?.[0]) || 0;
          const quantity = parseInt(item.getElementsByTagName("quantity_in_stock")[0]?.textContent) || 0;
          if (size && quantity > 0) {
            productsByGroup[groupId].sizes[size] = quantity;
          }
        }
      }
      allProducts = Object.values(productsByGroup);

      // Діагностика: перевіряємо кількість товарів
      console.log(`Знайдено унікальних товарів: ${allProducts.length}`);
      if (allProducts.length === 0) {
        console.warn("Попередження: жодного товару не знайдено");
        localStorage.clear(); // Очищаємо кеш, якщо товари відсутні
      }

      // Сортування за id (нові зверху)
      allProducts.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      // Зберігаємо в localStorage і оновлюємо відображення
      saveDataToStorage(allProducts);
      
      // Відображаємо 100 найновіших товарів для "Новинки"
      const newProducts = allProducts.slice(0, 100);
      renderProducts(newProducts);

      // Плануємо наступне оновлення через 3 хвилини
      scheduleNextUpdate();
    })
    .catch(err => {
      console.error("Помилка завантаження XML:", err);
      const cachedProducts = getCachedProducts();
      if (cachedProducts && cachedProducts.length > 0) {
        allProducts = cachedProducts;
        const newProducts = allProducts.slice(0, 100);
        renderProducts(newProducts);
        alert("Використовуються збережені дані через помилку завантаження.");
      } else {
        localStorage.clear(); // Очищаємо кеш, якщо його немає або він порожній
        alert("Помилка завантаження даних і немає кешованих даних. Спроба повторного завантаження...");
        fetchXmlData(true); // Повторний запит після очищення кешу з forceFetch
      }
      // Плануємо наступне оновлення, навіть якщо сталася помилка
      scheduleNextUpdate();
    });
}

// Функція для планування наступного оновлення
function scheduleNextUpdate() {
  const updateInterval = 3 * 60 * 1000; // 3 хвилини у мілісекундах
  setTimeout(() => {
    console.log("Виконується заплановане оновлення даних");
    fetchXmlData(true); // Force fetch для оновлення
  }, updateInterval);
}

// Відображення товарів
function renderProducts(products) {
  const container = document.getElementById("products");
  const lastUpdateDisplay = document.getElementById("lastUpdate");
  const lastUpdate = getLastUpdateTime();
  lastUpdateDisplay.textContent = lastUpdate ? new Date(lastUpdate).toLocaleString() : "Ніколи";
  container.innerHTML = "";

  products.forEach(product => {
    if (Object.keys(product.sizes).length === 0) return; // Пропускаємо, якщо немає наявних розмірів

    const productDiv = document.createElement("div");
    productDiv.className = "product";

    // Таблиця для розмірів і наявності
    let tableHtml = `<table><tr><th>Розмір</th><th>Довжина (см)</th><th>Наявність</th></tr>`;
    for (let size = 36; size <= 46; size++) {
      const inStock = product.sizes[size] || 0;
      const length = [22.5, 23.5, 24.0, 25.0, 25.5, 26.0, 26.5, 27.5, 28.0, 28.5, 29.0, 29.5][size - 36] || 0;
      tableHtml += `<tr ${inStock > 0 ? 'style="background-color: #90ee90;"' : ''}>
        <td>${size}</td><td>${length}</td><td>${inStock}</td></tr>`;
    }
    tableHtml += "</table>";

    productDiv.innerHTML = `
      <img src="${product.images[0] || ''}" alt="${product.name}" class="product-image">
      <h3>${product.name}</h3>
      <p>Ціна: ${product.price} грн</p>
      <p>Виробник: ${product.desc.match(/Виробник : (.*?)<\/p>/)?.[1] || 'Невідомо'}</p>
      ${tableHtml}
    `;
    container.appendChild(productDiv);
  });

  // Діагностика: перевіряємо, скільки товарів відображено
  console.log(`Відображено товарів: ${container.children.length}`);
}

// Зміна фільтра
document.getElementById("categorySelect").addEventListener("change", function() {
  const selected = this.value;
  console.log(`Вибрано категорію: ${selected}`);
  if (selected === "new") {
    const newProducts = allProducts.slice(0, 100);
    renderProducts(newProducts.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
  } else {
    const filtered = allProducts.filter(p => p.categoryId === selected);
    console.log(`Відфільтровано товарів для категорії ${selected}: ${filtered.length}`);
    renderProducts(filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
  }
});

// Початкове завантаження
console.log("Розпочато початкове завантаження");
fetchXmlData(); // Початкове завантаження без forceFetch