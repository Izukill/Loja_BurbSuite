const form = document.querySelector('#search-form');
const products = document.querySelector('#products');
const status = document.querySelector('#status');
const purchaseMode = document.querySelector('#purchase-mode');
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

async function buy(product, quantityInput, button, feedback) {
  const quantity = Number(quantityInput.value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    feedback.textContent = 'Escolha uma quantidade inteira de 1 a 10.';
    return;
  }

  const mode = purchaseMode.value;
  button.disabled = true;
  feedback.textContent = 'Calculando compra simulada…';
  try {
    const response = await fetch('/api/compras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: product.id,
        quantidade: quantity,
        precoUnitarioCentavos: product.preco_centavos,
        modo: mode
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro);
    feedback.textContent = `Compra simulada: ${data.quantidade} unidade(s), total ${currency.format(data.totalCentavos / 100)} · versão ${data.modo}. Nenhum pagamento realizado.`;
  } catch (error) {
    feedback.textContent = error.message || 'Não foi possível simular a compra.';
  } finally {
    button.disabled = false;
  }
}

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

      const purchaseForm = document.createElement('form');
      purchaseForm.className = 'purchase-form';
      const quantityLabel = document.createElement('label');
      quantityLabel.htmlFor = `quantity-${product.id}`;
      quantityLabel.textContent = 'Quantidade';
      const quantityInput = document.createElement('input');
      quantityInput.id = `quantity-${product.id}`;
      quantityInput.name = 'quantidade';
      quantityInput.type = 'number';
      quantityInput.min = '1';
      quantityInput.max = '10';
      quantityInput.step = '1';
      quantityInput.value = '1';
      quantityInput.required = true;
      const buyButton = document.createElement('button');
      buyButton.type = 'submit';
      buyButton.textContent = 'Simular compra';
      const feedback = document.createElement('p');
      feedback.className = 'purchase-feedback';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      purchaseForm.append(quantityLabel, quantityInput, buyButton);
      purchaseForm.addEventListener('submit', (event) => {
        event.preventDefault();
        buy(product, quantityInput, buyButton, feedback);
      });

      card.append(number, title, description, price, purchaseForm, feedback);
      products.append(card);
    }
  } catch (error) {
    status.textContent = error.message || 'Não foi possível carregar o catálogo.';
  }
}

form.addEventListener('submit', (event) => { event.preventDefault(); search(); });
document.querySelector('#mode').addEventListener('change', search);
search();

const registerForm = document.querySelector('#register-form');
const regFeedback = document.querySelector('#reg-feedback');
const loginForm = document.querySelector('#login-form');
const loginFeedback = document.querySelector('#login-feedback');

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const usuario = document.querySelector('#reg-username').value;
    const senha = document.querySelector('#reg-password').value;
    const modo = document.querySelector('#reg-mode').value;

    regFeedback.className = 'account-feedback';
    regFeedback.textContent = 'Cadastrando conta fictícia…';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/contas/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha, modo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);

      regFeedback.className = 'account-feedback success';
      regFeedback.textContent = `Conta "${data.usuario}" cadastrada com sucesso no modo ${data.modo}. A resposta HTTP não contém senhas.`;
      registerForm.reset();
    } catch (err) {
      regFeedback.className = 'account-feedback error';
      regFeedback.textContent = err.message || 'Erro ao realizar cadastro.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const usuario = document.querySelector('#login-username').value;
    const senha = document.querySelector('#login-password').value;
    const modo = document.querySelector('#login-mode').value;

    loginFeedback.className = 'account-feedback';
    loginFeedback.textContent = 'Verificando credenciais…';
    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/contas/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha, modo })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro);

      loginFeedback.className = 'account-feedback success';
      loginFeedback.textContent = `Login efetuado com sucesso para "${data.usuario}" (${data.modo}). Nenhuma sessão foi iniciada nesta etapa.`;
      loginForm.reset();
    } catch (err) {
      loginFeedback.className = 'account-feedback error';
      loginFeedback.textContent = err.message || 'Falha na autenticação.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}

