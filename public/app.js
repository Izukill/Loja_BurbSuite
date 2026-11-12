const form = document.querySelector('#search-form');
const products = document.querySelector('#products');
const status = document.querySelector('#status');
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

async function search() {

  const params = new URLSearchParams(new FormData(form));

  status.textContent = 'Buscando…';

  products.replaceChildren();

  try {
    const response = await fetch(`/api/produtos?${params}`);
    const data = await response.json();

    if (!response.ok) throw new Error(data.erro);

    status.textContent = `${data.total} produto(s) · versão ${data.modo}`;

    for (const product of data.produtos) {

      const card = document.createElement('article');
      card.className = 'card';

      const number = document.createElement('div');
      number.className = 'product-art';
      number.textContent = String(product.id).padStart(2, '0');

      const title = document.createElement('h3');
      title.textContent = product.nome;

      const description = document.createElement('p');
      description.textContent = product.descricao;

      const price = document.createElement('strong');
      price.textContent = currency.format(product.preco_centavos / 100);

      card.append(number, title, description, price);
      products.append(card);
    }
  } catch (error) {
    status.textContent = error.message || 'Não foi possível carregar o catálogo.';
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); search(); });
document.querySelector('#mode').addEventListener('change', search);
search();
