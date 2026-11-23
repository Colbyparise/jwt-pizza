import http from 'k6/http';
import { sleep, check, fail } from 'k6';

export const options = {
  cloud: {
    distribution: {
      'amazon:us:ashburn': {
        loadZone: 'amazon:us:ashburn',
        percent: 100,
      },
    },
  },
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate==0'],
  },
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },
        { target: 15, duration: '1m' },
        { target: 10, duration: '30s' },
        { target: 0, duration: '30s' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
};

const serviceUrl = (__ENV.PIZZA_SERVICE_URL || 'https://pizza-service.colbypizza.click').replace(/\/+$/, '');
const factoryUrl = (__ENV.PIZZA_FACTORY_URL || 'https://pizza-factory.cs329.click').replace(/\/+$/, '');
const appOrigin = __ENV.PIZZA_APP_ORIGIN || 'https://pizza.colbypizza.click';

// These defaults match generatePizzaData.sh. Override them if your demo account differs.
const credentials = {
  email: __ENV.PIZZA_EMAIL || 'd@jwt.com',
  password: __ENV.PIZZA_PASSWORD || 'diner',
};

const jsonHeaders = {
  accept: 'application/json',
  'content-type': 'application/json',
  origin: appOrigin,
};

function require200(response, name) {
  if (!check(response, {
    [`${name} returns HTTP 200`]: (r) => r.status === 200,
  })) {
    fail(`${name} failed with HTTP ${response.status}`);
  }
}

function requireCheck(condition, name) {
  if (!check(condition, { [name]: (passed) => passed === true })) {
    fail(`Check failed: ${name}`);
  }
}

function readJson(response, name) {
  let data;
  let parsed = false;
  try {
    data = response.json();
    parsed = true;
  } catch {
    // Record malformed responses as failed checks before stopping the iteration.
  }
  requireCheck(parsed, `${name} returns valid JSON`);
  return data;
}

export function scenario_1() {
  // 1. Log in and use this iteration's authentication token.
  let response = http.put(
    `${serviceUrl}/api/auth`,
    JSON.stringify(credentials),
    { headers: jsonHeaders }
  );
  require200(response, 'Login');
  const loginData = readJson(response, 'Login');
  requireCheck(
    typeof loginData?.token === 'string' && loginData.token.length > 0,
    'Login includes an authentication token'
  );
  const authHeaders = {
    ...jsonHeaders,
    authorization: `Bearer ${loginData.token}`,
  };
  sleep(4);

  // 2. Browse the menu and choose a pizza from the current response.
  response = http.get(`${serviceUrl}/api/order/menu`, { headers: authHeaders });
  require200(response, 'Menu');
  const menu = readJson(response, 'Menu');
  requireCheck(Array.isArray(menu) && menu.length > 0, 'Menu contains a pizza');
  const pizza = menu[0];
  sleep(1);

  // Select an existing franchise and store rather than assuming particular IDs.
  response = http.get(`${serviceUrl}/api/franchise?page=0&limit=20&name=*`, {
    headers: authHeaders,
  });
  require200(response, 'Franchise list');
  const franchiseData = readJson(response, 'Franchise list');
  const franchises = Array.isArray(franchiseData?.franchises) ? franchiseData.franchises : [];
  const franchise = franchises.find((entry) => Array.isArray(entry.stores) && entry.stores.length > 0);
  requireCheck(Boolean(franchise), 'A franchise has an available store');
  const store = franchise.stores[0];
  sleep(3);

  response = http.get(`${serviceUrl}/api/user/me`, { headers: authHeaders });
  require200(response, 'User profile');
  sleep(1);

  // GET /api/order lists past orders; it does not buy a pizza or return its JWT.
  response = http.get(`${serviceUrl}/api/order`, { headers: authHeaders });
  require200(response, 'Order history');

  // 3. Buy a pizza using the same POST body as the application's checkout.
  const order = {
    franchiseId: franchise.id,
    storeId: store.id,
    items: [{ menuId: pizza.id, description: pizza.title, price: pizza.price }],
  };
  response = http.post(`${serviceUrl}/api/order`, JSON.stringify(order), {
    headers: authHeaders,
  });
  require200(response, 'Purchase');
  const purchaseData = readJson(response, 'Purchase');
  requireCheck(
    typeof purchaseData?.jwt === 'string' && purchaseData.jwt.length > 0,
    'Purchase includes a pizza JWT'
  );
  const orderJwt = purchaseData.jwt;
  sleep(2);

  // 4. Verify the JWT from this purchase, separately from the login token.
  response = http.post(
    `${factoryUrl}/api/order/verify`,
    JSON.stringify({ jwt: orderJwt }),
    { headers: jsonHeaders }
  );
  require200(response, 'Pizza verification');
  const verification = readJson(response, 'Pizza verification');
  requireCheck(verification?.message === 'valid', 'Pizza JWT is valid');
}
