const xmlUrl = "https://easydrop.one/prom-export?key=24481682017071&pid=32494472342744";
let allProducts = [];

// Функція для отримання часу останнього оновлення з localStorage
function getLastUpdateTime() {
  return parseInt(localStorage.getItem('lastUpdateTime') || '0');
}

// Функція для збереження даних у localStorage
function saveDataToStorage(products) {
  localStorage.setItem('cachedProducts', JSON.stringify(products));
  localStorage.setItem('lastUpdateTime', Date.now().toString());
}

// Функція для завантаження даних з XML
function fetchXmlData() {
  fetch(xmlUrl)
    .then(res => res.text())
    .then(str => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(str, "application/xml");

      const categories = xml.getElementsByTagName("category");
      const categorySelect = document.getElementById("categorySelect");

      // Додаємо категорії у select
      categorySelect.innerHTML = '<option value="all">Всі</option>'; // Очищуємо і додаємо "Всі"
      for (let category of categories) {
        const option = document.createElement("option");
        option.value = category.getAttribute("id");
        option.textContent = category.textContent;
        categorySelect.appendChild(option);
      }

      const items = xml.getElementsByTagName("item");
      const productsByGroup = {};
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

      // Сортування за id (нові зверху)
      allProducts.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      saveDataToStorage(allProducts); // Зберігаємо в localStorage
      renderProducts(allProducts);
    })
    .catch(err => console.error("Помилка завантаження XML:", err));
}

// Основна логіка завантаження
const lastUpdate = getLastUpdateTime();
const thirtyMinutes = 30 * 60 * 1000; // 30 хвилин у мілісекундах

if (Date.now() - lastUpdate < thirtyMinutes) {
  // Використовуємо кешовані дані
  const cachedProducts = localStorage.getItem('cachedProducts');
  if (cachedProducts) {
    allProducts = JSON.parse(cachedProducts);
    renderProducts(allProducts);
  } else {
    fetchXmlData(); // Якщо немає кешу, завантажуємо
  }
} else {
  // Оновлюємо дані
  fetchXmlData();
}

// Відображення товарів
function renderProducts(products) {
  const container = document.getElementById("products");
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
}

// Зміна фільтра
document.getElementById("categorySelect").addEventListener("change", function() {
  const selected = this.value;
  if (selected === "all") {
    renderProducts(allProducts.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
  } else {
    const filtered = allProducts.filter(p => p.categoryId === selected);
    renderProducts(filtered.sort((a, b) => parseInt(b.id) - parseInt(a.id)));
  }
});

// Автоматичне оновлення кожні 30 хвилин
setInterval(() => {
  const lastUpdate = getLastUpdateTime();
  if (Date.now() - lastUpdate >= thirtyMinutes) {
    fetchXmlData();
  }
}, thirtyMinutes);
