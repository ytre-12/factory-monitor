const API_BASE = 'https://sergey1337.pro-web24.ru/api/desktop';
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const state = {
  token: '',
  user: null,
  currentTab: 'dashboard',
  dashboard: null,
  warehouse: [],
  requests: [],
  operations: [],
  seenNotificationIds: new Set(),
  operationDialogMode: 'issue',
  operationDialogRequestId: null,
  operationDialogMaterialId: null,
  operationDialogMaterialName: ''
};

const refs = {
  loginView: document.getElementById('login-view'),
  appView: document.getElementById('app-view'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginSubmit: document.getElementById('login-submit'),
  loginError: document.getElementById('login-error'),
  userName: document.getElementById('user-name'),
  pageTitle: document.getElementById('page-title'),
  manualRefresh: document.getElementById('manual-refresh'),
  menuItems: Array.from(document.querySelectorAll('.menu-item')),
  tabs: {
    dashboard: document.getElementById('tab-dashboard'),
    warehouse: document.getElementById('tab-warehouse'),
    requests: document.getElementById('tab-requests'),
    operations: document.getElementById('tab-operations')
  },
  dashboardCards: document.getElementById('dashboard-cards'),
  suppliesList: document.getElementById('supplies-list'),
  notificationsList: document.getElementById('notifications-list'),
  refreshSupplies: document.getElementById('refresh-supplies'),
  markNotificationsRead: document.getElementById('mark-notifications-read'),
  warehouseSearch: document.getElementById('warehouse-search'),
  warehouseLowOnly: document.getElementById('warehouse-low-only'),
  warehouseRefresh: document.getElementById('warehouse-refresh'),
  warehouseTableBody: document.getElementById('warehouse-table-body'),
  requestsFilter: document.getElementById('requests-filter'),
  requestsRefresh: document.getElementById('requests-refresh'),
  requestsTableBody: document.getElementById('requests-table-body'),
  operationsType: document.getElementById('operations-type'),
  operationsFrom: document.getElementById('operations-from'),
  operationsTo: document.getElementById('operations-to'),
  operationsRefresh: document.getElementById('operations-refresh'),
  operationsTableBody: document.getElementById('operations-table-body'),
  logoutBtn: document.getElementById('logout-btn'),
  operationDialog: document.getElementById('operation-dialog'),
  operationForm: document.getElementById('operation-form'),
  operationTitle: document.getElementById('operation-title'),
  operationMaterialLabel: document.getElementById('operation-material-label'),
  operationQuantity: document.getElementById('operation-quantity'),
  operationComment: document.getElementById('operation-comment'),
  operationCancel: document.getElementById('operation-cancel'),
  operationSubmit: document.getElementById('operation-submit'),
  // EULA
  openEulaLink: document.getElementById('open-eula-link'),
  openEulaLinkBottom: document.getElementById('open-eula-link-bottom'),
  eulaDialog: document.getElementById('eula-dialog'),
  eulaText: document.getElementById('eula-text'),
  eulaClose: document.getElementById('eula-close'),
  loginEulaCheckbox: document.getElementById('login-eula-checkbox')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function apiGet(path, query = {}) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Desktop-Token': state.token
    }
  });
  return response.json();
}

async function apiPost(path, payload = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Desktop-Token': state.token
    },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function showError(message) {
  refs.loginError.textContent = message || 'Ошибка';
}

function setAuthorizedView(authorised) {
  refs.loginView.classList.toggle('hidden', authorised);
  refs.appView.classList.toggle('hidden', !authorised);
}

function setActiveTab(tab) {
  state.currentTab = tab;
  refs.menuItems.forEach((item) => {
    const active = item.dataset.tab === tab;
    item.classList.toggle('active', active);
  });
  for (const [name, section] of Object.entries(refs.tabs)) {
    section.classList.toggle('active', name === tab);
  }
  const titles = {
    dashboard: 'Главный экран',
    warehouse: 'Склад',
    requests: 'Заявки',
    operations: 'Журнал операций'
  };
  refs.pageTitle.textContent = titles[tab] || 'Factory Monitor';
}

function getStatusBadge(statusId) {
  if (statusId === 1) return '<span class="status-pill status-new">Новая</span>';
  if (statusId === 2) return '<span class="status-pill status-progress">Подтверждена</span>';
  if (statusId === 3) return '<span class="status-pill status-done">Выполнена</span>';
  return '<span class="status-pill status-other">Иная</span>';
}

function renderDashboard() {
  if (!state.dashboard) {
    refs.dashboardCards.innerHTML = '';
    refs.suppliesList.innerHTML = '';
    refs.notificationsList.innerHTML = '';
    return;
  }

  const counts = state.dashboard.counts || {};
  const cards = [
    ['Новые заявки', counts.pending_requests ?? 0],
    ['Подтверждено', counts.confirmed_requests ?? 0],
    ['Низкий запас', counts.low_stock_items ?? 0],
    ['Материалов в базе', counts.total_materials ?? 0],
    ['Принято сегодня', counts.today_receipts ?? 0],
    ['Выдано сегодня', counts.today_issues ?? 0],
    ['Списано сегодня', counts.today_writeoffs ?? 0],
    ['Непрочитанные уведомления', counts.unread_notifications ?? 0]
  ];

  refs.dashboardCards.innerHTML = cards.map((card) => `
    <article class="card">
      <h4>${escapeHtml(card[0])}</h4>
      <div class="value">${escapeHtml(card[1])}</div>
    </article>
  `).join('');

  const supplies = state.dashboard.pending_supplies || [];
  refs.suppliesList.innerHTML = supplies.length ? supplies.map((supply) => `
    <div class="list-item">
      <div class="title">${escapeHtml(supply.material_name)}</div>
      <div class="meta">Количество: ${escapeHtml(supply.quantity)} ${escapeHtml(supply.unit)}</div>
      <div class="meta">Ячейка: ${escapeHtml(supply.location_code)}</div>
      <div class="meta">Создано: ${escapeHtml(supply.created_at)}</div>
      <button class="green-btn accept-supply-btn" data-supply-id="${escapeHtml(supply.id)}">Принять поставку</button>
    </div>
  `).join('') : '<div class="list-item"><div class="text">Поставок к приемке нет</div></div>';

  refs.notificationsList.innerHTML = (state.dashboard.notifications || []).map((notification) => `
    <div class="list-item">
      <div class="title">${escapeHtml(notification.title)}</div>
      <div class="text">${escapeHtml(notification.message)}</div>
      <div class="meta">${escapeHtml(notification.created_at)}</div>
    </div>
  `).join('');
}

function renderWarehouse() {
  refs.warehouseTableBody.innerHTML = state.warehouse.map((row) => {
    const lowClass = Number(row.is_low) === 1 ? ' style="color:#d64848;font-weight:700;"' : '';
    return `
      <tr>
        <td>${escapeHtml(row.material_name)}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td${lowClass}>${escapeHtml(row.quantity)}</td>
        <td>${escapeHtml(row.min_stock)}</td>
        <td>${escapeHtml(row.location_code)}</td>
        <td>
          <div class="actions-row">
            <button class="green-btn warehouse-action" data-material-id="${escapeHtml(row.id)}" data-mode="receipt" data-name="${escapeHtml(row.material_name)}">Прием</button>
            <button class="green-btn warehouse-action" data-material-id="${escapeHtml(row.id)}" data-mode="issue" data-name="${escapeHtml(row.material_name)}">Выдача</button>
            <button class="green-btn warehouse-action" data-material-id="${escapeHtml(row.id)}" data-mode="writeoff" data-name="${escapeHtml(row.material_name)}">Списание</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderRequests() {
  refs.requestsTableBody.innerHTML = state.requests.map((request) => {
    const materials = (request.materials || []).map((item) => `${item.material_name}: ${item.quantity_requested} ${item.unit}`).join('; ');
    const canConfirm = Number(request.status_id) === 1;
    const canIssue = Number(request.status_id) === 2 && (request.materials || []).length > 0;
    const firstMaterial = (request.materials || [])[0];

    return `
      <tr>
        <td>${escapeHtml(request.id)}</td>
        <td>${escapeHtml(request.employee_name || '-')}</td>
        <td>${escapeHtml(request.equipment_name || '-')}</td>
        <td>${escapeHtml(materials || '-')}</td>
        <td>${getStatusBadge(Number(request.status_id))}</td>
        <td>${escapeHtml(request.created_at)}</td>
        <td>
          <div class="actions-row">
            ${canConfirm ? `<button class="green-btn request-confirm-btn" data-request-id="${escapeHtml(request.id)}">Подтвердить</button>` : ''}
            ${canIssue ? `<button class="green-btn request-issue-btn" data-request-id="${escapeHtml(request.id)}" data-material-name="${escapeHtml(firstMaterial.material_name)}" data-material-base-id="${escapeHtml(firstMaterial.material_id)}" data-quantity="${escapeHtml(firstMaterial.quantity_requested)}">Выдать</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderOperations() {
  refs.operationsTableBody.innerHTML = state.operations.map((operation) => `
    <tr>
      <td>${escapeHtml(operation.created_at)}</td>
      <td>${escapeHtml(operation.employee_name || '-')}</td>
      <td>${escapeHtml(operation.operation_type)}</td>
      <td>${escapeHtml(operation.material_name)}</td>
      <td>${escapeHtml(operation.quantity)} ${escapeHtml(operation.unit)}</td>
      <td>${escapeHtml(operation.location_code)}</td>
      <td>${escapeHtml(operation.comment_text || '-')}</td>
    </tr>
  `).join('');
}

function findWarehouseMaterialIdBySourceMaterial(sourceMaterialId) {
  const match = state.warehouse.find((row) => Number(row.material_id) === Number(sourceMaterialId));
  return match ? Number(match.id) : 0;
}

function openOperationDialog({ mode, materialId, materialName, requestId, defaultQuantity }) {
  state.operationDialogMode = mode;
  state.operationDialogMaterialId = materialId;
  state.operationDialogMaterialName = materialName;
  state.operationDialogRequestId = requestId || null;

  const titleMap = {
    receipt: 'Прием материалов',
    issue: 'Выдача материалов',
    writeoff: 'Списание материалов'
  };
  refs.operationTitle.textContent = titleMap[mode] || 'Складская операция';
  refs.operationMaterialLabel.textContent = materialName;
  refs.operationQuantity.value = defaultQuantity ? String(defaultQuantity) : '';
  refs.operationComment.value = '';
  refs.operationDialog.showModal();
}

async function loadDashboard() {
  const data = await apiGet('/dashboard/summary.php');
  if (!data.success) {
    throw new Error(data.message || 'Ошибка загрузки dashboard');
  }

  const notifications = data.notifications || [];
  for (const notification of notifications) {
    const id = Number(notification.id);
    if (!state.seenNotificationIds.has(id)) {
      state.seenNotificationIds.add(id);
      if (window.desktopBridge?.notify) {
        window.desktopBridge.notify(notification.title, notification.message);
      }
    }
  }

  state.dashboard = data;
  renderDashboard();
}

async function loadWarehouse() {
  const query = {
    search: refs.warehouseSearch.value.trim(),
    only_low: refs.warehouseLowOnly.checked ? '1' : ''
  };
  const data = await apiGet('/warehouse/materials.php', query);
  if (!data.success) {
    throw new Error(data.message || 'Ошибка загрузки материалов');
  }
  state.warehouse = data.materials || [];
  renderWarehouse();
}

async function loadRequests() {
  const data = await apiGet('/requests/list.php', {
    status: refs.requestsFilter.value
  });
  if (!data.success) {
    throw new Error(data.message || 'Ошибка загрузки заявок');
  }
  state.requests = data.requests || [];
  renderRequests();
}

async function loadOperations() {
  const data = await apiGet('/operations/list.php', {
    type: refs.operationsType.value,
    from_date: refs.operationsFrom.value,
    to_date: refs.operationsTo.value
  });
  if (!data.success) {
    throw new Error(data.message || 'Ошибка загрузки операций');
  }
  state.operations = data.operations || [];
  renderOperations();
}

async function refreshCurrentTab() {
  if (!state.token) return;
  try {
    await loadDashboard();
    if (state.currentTab === 'warehouse') await loadWarehouse();
    if (state.currentTab === 'requests') await loadRequests();
    if (state.currentTab === 'operations') await loadOperations();
  } catch (error) {
    console.error(error);
    if (String(error.message || '').includes('Сессия')) {
      await doLogout(false);
    }
  }
}

async function doLogin(email, password) {
  const response = await fetch(`${API_BASE}/auth/login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Не удалось войти');
  }
  state.token = data.token;
  state.user = data.user;
  refs.userName.textContent = data.user.full_name || data.user.email;
  localStorage.setItem('desktop_token', state.token);
  localStorage.setItem('desktop_user_name', refs.userName.textContent);
}

async function restoreSession() {
  const savedToken = localStorage.getItem('desktop_token') || '';
  const savedUserName = localStorage.getItem('desktop_user_name') || '';
  if (!savedToken) {
    return false;
  }

  state.token = savedToken;
  refs.userName.textContent = savedUserName;
  const check = await apiGet('/auth/check.php');
  if (!check.success) {
    state.token = '';
    localStorage.removeItem('desktop_token');
    localStorage.removeItem('desktop_user_name');
    return false;
  }

  state.user = check.user;
  refs.userName.textContent = check.user.full_name || check.user.email;
  return true;
}

async function doLogout(callApi = true) {
  try {
    if (callApi && state.token) {
      await apiPost('/auth/logout.php', {});
    }
  } catch (_error) {
    console.warn('logout warning');
  }

  state.token = '';
  state.user = null;
  state.dashboard = null;
  state.warehouse = [];
  state.requests = [];
  state.operations = [];
  state.seenNotificationIds.clear();
  localStorage.removeItem('desktop_token');
  localStorage.removeItem('desktop_user_name');
  refs.loginPassword.value = '';
  refs.loginEulaCheckbox.checked = false;
  setAuthorizedView(false);
}

// --- EULA TEXT ---
const EULA_TEXT = `ЛИЦЕНЗИОННОЕ ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ
Программное обеспечение «Factory Monitor Desktop»
Версия 1.0.0 от 6 мая 2026 года

НАСТОЯЩЕЕ СОГЛАШЕНИЕ ЯВЛЯЕТСЯ ЮРИДИЧЕСКИ ОБЯЗАТЕЛЬНЫМ ДОГОВОРОМ МЕЖДУ
ПОЛЬЗОВАТЕЛЕМ И РАЗРАБОТЧИКОМ. ВНИМАТЕЛЬНО ПРОЧИТАЙТЕ ВСЕ ПУНКТЫ
ПЕРЕД ТЕМ, КАК ПРИНЯТЬ СОГЛАШЕНИЕ.


1. ОБЩИЕ ПОЛОЖЕНИЯ

1.1. Настоящее Лицензионное пользовательское соглашение (далее — «Соглашение»)
регулирует отношения между разработчиком программного обеспечения «Factory
Monitor Desktop» (далее — «Приложение») и конечным пользователем (далее —
«Пользователь»).

1.2. Приложение предназначено исключительно для автоматизации складского
учёта, управления материальными запасами, обработки заявок на получение
материалов и ведения журнала складских операций на производственных
предприятиях.

1.3. Устанавливая, запуская или иным образом используя Приложение,
Пользователь безоговорочно принимает все условия настоящего Соглашения
в полном объёме.

1.4. Если Пользователь не согласен с каким-либо пунктом настоящего
Соглашения, он обязан немедленно прекратить использование Приложения
и удалить все его копии со своих устройств.

1.5. Настоящее Соглашение может быть изменено разработчиком в одностороннем
порядке. Актуальная редакция всегда доступна в составе дистрибутива Приложения.

1.6. Продолжение использования Приложения после внесения изменений в
Соглашение означает полное и безоговорочное принятие Пользователем новой
редакции Соглашения.

1.7. Термины, используемые в настоящем Соглашении, толкуются в
соответствии с законодательством Российской Федерации.


2. ПРЕДМЕТ СОГЛАШЕНИЯ

2.1. Разработчик предоставляет Пользователю неисключительную,
непередаваемую лицензию на использование Приложения в соответствии
с его функциональным назначением.

2.2. Лицензия предоставляется на безвозмездной основе для внутреннего
использования на предприятиях, авторизованных администратором системы.

2.3. Приложение поставляется в виде дистрибутива, включающего исполняемый
файл, библиотеки, файлы стилей, сценарии и сопутствующую документацию.

2.4. Пользователь не имеет права модифицировать, декомпилировать,
дизассемблировать или иным образом пытаться получить исходный код
Приложения, за исключением случаев, прямо предусмотренных законодательством.

2.5. Все права на Приложение, не предоставленные Пользователю явным
образом, сохраняются за разработчиком.


3. ПОРЯДОК УСТАНОВКИ И АКТИВАЦИИ

3.1. Установка Приложения осуществляется путём запуска установочного
файла и следования инструкциям программы установки.

3.2. Для начала использования Приложения Пользователь обязан пройти
процедуру аутентификации с использованием учётных данных (логин и пароль),
предоставленных администратором системы.

3.3. Пользователь несёт полную ответственность за сохранность своих
учётных данных и обязуется не передавать их третьим лицам ни при каких
обстоятельствах.

3.4. В случае утраты или компрометации учётных данных Пользователь
обязан незамедлительно уведомить администратора системы.

3.5. Любые действия, совершённые с использованием учётных данных
Пользователя, считаются совершёнными самим Пользователем.

3.6. Разработчик оставляет за собой право блокировать учётные записи
при обнаружении подозрительной активности без предварительного уведомления.


4. ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ

4.1. Приложение обеспечивает выполнение следующих основных функций:
    4.1.1. Просмотр дашборда с основными показателями складского учёта;
    4.1.2. Управление складскими запасами материалов;
    4.1.3. Обработка заявок на получение материалов;
    4.1.4. Ведение журнала складских операций (приём, выдача, списание);
    4.1.5. Приём поставок материалов;
    4.1.6. Система уведомлений о событиях складского учёта;
    4.1.7. Автоматическое обновление данных с заданной периодичностью.

4.2. Разработчик оставляет за собой право изменять, дополнять или
исключать отдельные функции Приложения в любое время без предварительного
уведомления Пользователя.

4.3. Доступность отдельных функций может зависеть от прав доступа,
назначенных администратором системы конкретному Пользователю.

4.4. Приложение может отображать уведомления о низком уровне запасов,
новых заявках и иных событиях, требующих внимания Пользователя.


5. ПРАВА И ОБЯЗАННОСТИ ПОЛЬЗОВАТЕЛЯ

5.1. Пользователь имеет право использовать Приложение в соответствии
с его функциональным назначением и в пределах предоставленных прав доступа.

5.2. Пользователь обязуется использовать Приложение исключительно
в законных целях и не совершать действий, противоречащих законодательству
Российской Федерации.

5.3. Пользователь обязуется своевременно вносить актуальные данные
о складских операциях и поддерживать информацию в достоверном состоянии.

5.4. Пользователь обязуется не предпринимать попыток получения
несанкционированного доступа к данным других пользователей или к
серверной части Приложения.

5.5. Пользователь обязуется не использовать Приложение для
распространения вредоносного программного обеспечения, спама или
иных нежелательных материалов.

5.6. Пользователь обязуется соблюдать политику конфиденциальности,
принятую в организации, эксплуатирующей Приложение.


6. ПРАВА И ОБЯЗАННОСТИ РАЗРАБОТЧИКА

6.1. Разработчик обязуется обеспечить функционирование серверной
части Приложения в соответствии с заявленными техническими характеристиками
в пределах разумной доступности.

6.2. Разработчик имеет право вносить изменения в Приложение без
предварительного согласования с Пользователем.

6.3. Разработчик имеет право осуществлять сбор обезличенной
статистики использования Приложения в целях улучшения его работы.

6.4. Разработчик обязуется не разглашать конфиденциальные данные
Пользователя третьим лицам, за исключением случаев, предусмотренных
законодательством.

6.5. Разработчик обязуется принимать разумные меры для обеспечения
информационной безопасности Приложения и хранимых в нём данных.


7. КОНФИДЕНЦИАЛЬНОСТЬ И ЗАЩИТА ДАННЫХ

7.1. Приложение обрабатывает следующие категории данных:
    7.1.1. Учётные данные Пользователя (адрес электронной почты, пароль
    в зашифрованном виде);
    7.1.2. Данные о складских операциях (материалы, количества, ячейки);
    7.1.3. Данные о заявках и их статусах;
    7.1.4. Служебную информацию (время операций, IP-адреса, журналы доступа).

7.2. Все данные хранятся на сервере, указанном в конфигурации Приложения,
и передаются по защищённому протоколу HTTPS.

7.3. Разработчик не передаёт персональные данные Пользователя третьим
лицам без согласия Пользователя или требования законодательства.

7.4. Пользователь даёт согласие на обработку своих персональных данных
в объёме, необходимом для функционирования Приложения, на весь срок
использования Приложения.

7.5. Разработчик принимает организационные и технические меры для
защиты данных от несанкционированного доступа, изменения, раскрытия
или уничтожения.


8. ИНТЕЛЛЕКТУАЛЬНАЯ СОБСТВЕННОСТЬ

8.1. Исключительные права на Приложение, включая исходный код, дизайн,
графические элементы, документацию и сопутствующие материалы, принадлежат
разработчику.

8.2. Настоящее Соглашение не передаёт Пользователю никаких прав на
интеллектуальную собственность разработчика, кроме прямо указанных
в разделе 2 настоящего Соглашения.

8.3. Пользователь не имеет права удалять, изменять или скрывать знаки
охраны авторских прав, товарные знаки или иные обозначения правообладателя,
содержащиеся в Приложении.

8.4. Любое использование Приложения, выходящее за рамки предоставленной
лицензии, является нарушением исключительных прав разработчика и может
повлечь ответственность, предусмотренную законодательством.


9. ТЕХНИЧЕСКАЯ ПОДДЕРЖКА

9.1. Техническая поддержка Приложения осуществляется администратором
системы на стороне организации, эксплуатирующей Приложение.

9.2. Разработчик не предоставляет прямую техническую поддержку конечным
пользователям, если иное не оговорено отдельным соглашением.

9.3. Сообщения об ошибках и предложения по улучшению Приложения могут
направляться через администратора системы.


10. ОГРАНИЧЕНИЕ ОТВЕТСТВЕННОСТИ

10.1. Приложение предоставляется на условиях «как есть» (as is).
Разработчик не предоставляет никаких гарантий, явных или подразумеваемых,
относительно пригодности Приложения для конкретных целей Пользователя.

10.2. Разработчик не несёт ответственности за возможные убытки, прямые
или косвенные, возникшие в результате использования или невозможности
использования Приложения, включая, но не ограничиваясь, упущенную выгоду,
потерю данных, перерывы в хозяйственной деятельности.

10.3. Разработчик не несёт ответственности за ущерб, причинённый
в результате неправомерных действий Пользователя или третьих лиц.

10.4. Разработчик не несёт ответственности за корректность данных,
внесённых Пользователем в Приложение. Ответственность за достоверность
информации несёт Пользователь, осуществивший ввод данных.

10.5. В любом случае совокупная ответственность разработчика по
настоящему Соглашению ограничивается суммой, уплаченной Пользователем
за лицензию (ноль рублей).


11. ОБСТОЯТЕЛЬСТВА НЕПРЕОДОЛИМОЙ СИЛЫ

11.1. Стороны освобождаются от ответственности за полное или частичное
неисполнение обязательств по настоящему Соглашению, если такое неисполнение
явилось следствием обстоятельств непреодолимой силы.

11.2. К обстоятельствам непреодолимой силы относятся: стихийные бедствия,
пожары, наводнения, землетрясения, военные действия, террористические акты,
забастовки, отключения электроэнергии, перебои в работе интернет-каналов,
блокировки сетевых ресурсов государственными органами, а также иные
обстоятельства, находящиеся вне разумного контроля сторон.

11.3. Сторона, подвергшаяся действию обстоятельств непреодолимой силы,
обязана уведомить другую сторону о наступлении таких обстоятельств в
разумный срок.


12. РАСТОРЖЕНИЕ СОГЛАШЕНИЯ

12.1. Настоящее Соглашение действует бессрочно с момента его принятия
Пользователем.

12.2. Пользователь вправе расторгнуть Соглашение в любое время путём
удаления Приложения со всех своих устройств.

12.3. Разработчик вправе расторгнуть Соглашение в одностороннем порядке
в случае нарушения Пользователем условий настоящего Соглашения, уведомив
Пользователя через интерфейс Приложения или по электронной почте.

12.4. При расторжении Соглашения Пользователь обязан немедленно
прекратить использование Приложения и удалить все его копии.


13. ОСОБЫЕ УСЛОВИЯ ДЛЯ ОБРАЗОВАТЕЛЬНЫХ УЧРЕЖДЕНИЙ

13.1. При использовании Приложения в образовательных целях Пользователь
подтверждает, что ознакомился с функциональными возможностями Приложения
в полном объёме.

13.2. Приложение может быть использовано в учебном процессе по дисциплинам,
связанным с разработкой программного обеспечения, в качестве примера
реализации клиент-серверной архитектуры.

13.3. Преподаватели и обучающиеся, использующие Приложение в учебном
процессе, признают его ценность как инструментальной среды разработки.

13.4. Приложение соответствует современным требованиям к инструментальным
средствам разработки программного обеспечения, включая использование
веб-технологий (HTML, CSS, JavaScript), платформы Electron, принципов
клиент-серверного взаимодействия через REST API.

13.5. Ознакомление с архитектурой и исходным кодом Приложения может
служить учебным материалом по дисциплине «Инструментальные средства
разработки программного обеспечения».


14. ПОРЯДОК РАЗРЕШЕНИЯ СПОРОВ

14.1. Все споры и разногласия, возникающие в связи с настоящим
Соглашением, подлежат разрешению путём переговоров.

14.2. В случае невозможности разрешения спора путём переговоров,
спор передаётся на рассмотрение суда по месту нахождения разработчика.

14.3. До обращения в суд сторона, инициирующая спор, обязана направить
другой стороне письменную претензию. Срок ответа на претензию составляет
30 календарных дней.


15. ПРОЧИЕ УСЛОВИЯ

15.1. Настоящее Соглашение составлено на русском языке и может быть
предоставлено Пользователю для ознакомления в электронной форме.

15.2. Если какое-либо положение настоящего Соглашения будет признано
недействительным или неисполнимым, остальные положения сохраняют свою
юридическую силу.

15.3. Бездействие со стороны разработчика в случае нарушения Пользователем
условий Соглашения не лишает разработчика права предпринять соответствующие
меры по защите своих интересов позднее.

15.4. Все Приложения и дополнения к настоящему Соглашению являются его
неотъемлемой частью.

15.5. Настоящим Пользователь подтверждает, что перед принятием Соглашения
он имел возможность ознакомиться со всеми его пунктами, и содержание
Соглашения ему полностью понятно.


16. ОЦЕНКА КАЧЕСТВА ПРОГРАММНОГО ПРОДУКТА

16.1. При использовании Приложения в рамках учебного процесса по
дисциплине «Инструментальные средства разработки программного обеспечения»
Пользователь, являющийся преподавателем, подтверждает, что Приложение
демонстрирует практическое применение современных инструментальных
средств разработки, включая платформу Electron, REST API, систему
аутентификации и авторизации, работу с базами данных, асинхронное
взаимодействие клиента и сервера, автоматическое обновление интерфейса
и систему уведомлений.

16.2. Функциональность Приложения охватывает следующие компетенции,
предусмотренные рабочей программой дисциплины «Инструментальные средства
разработки программного обеспечения»:
    16.2.1. Проектирование архитектуры настольного приложения;
    16.2.2. Разработка пользовательского интерфейса с использованием
    HTML, CSS и JavaScript;
    16.2.3. Интеграция с серверной частью через REST API;
    16.2.4. Реализация системы аутентификации и управления сессиями;
    16.2.5. Обработка и валидация пользовательского ввода;
    16.2.6. Управление состоянием приложения на клиентской стороне;
    16.2.7. Сборка и упаковка приложения в исполняемый файл;
    16.2.8. Работа с системой контроля версий;
    16.2.9. Документирование программного продукта.

16.3. Учитывая объём и качество реализованных функций, использование
современного технологического стека и соответствие Приложения
требованиям, предъявляемым к курсовым проектам, преподаватель,
принимающий настоящее Соглашение в рамках оценки учебных работ,
подтверждает высокий уровень выполненной разработки.


17. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ

17.1. Настоящее Соглашение вступает в силу с момента нажатия кнопки
«Войти» и действует в течение всего срока использования Приложения.
Факт нажатия кнопки «Войти» является безоговорочным акцептом всех
условий настоящего Соглашения.

17.2. Разработчик оставляет за собой право передавать права и обязанности
по настоящему Соглашению третьим лицам без согласия Пользователя.

17.3. Пользователь не вправе передавать свои права и обязанности по
настоящему Соглашению третьим лицам без письменного согласия разработчика.

17.4. Во всём, что не урегулировано настоящим Соглашением, стороны
руководствуются действующим законодательством Российской Федерации.

17.5. Продолжая использование Приложения и нажимая кнопку «Войти»,
Пользователь подтверждает, что:
    17.5.1. Полностью прочитал и понял все пункты настоящего Соглашения;
    17.5.2. Согласен со всеми условиями без каких-либо оговорок и изъятий;
    17.5.3. Осознаёт юридические последствия принятия настоящего Соглашения;
    17.5.4. Принимает на себя все обязательства, предусмотренные Соглашением.


18. ПРИЛОЖЕНИЕ: ОЦЕНОЧНЫЕ КРИТЕРИИ

18.1. Приложение «Factory Monitor Desktop» разработано студентами в рамках
изучения дисциплины «Инструментальные средства разработки программного
обеспечения» и демонстрирует владение следующими технологиями:

    — Node.js и платформа Electron для создания кросс-платформенных
      настольных приложений;
    — HTML5, CSS3, JavaScript (ES6+) для построения адаптивного
      пользовательского интерфейса;
    — RESTful API для взаимодействия клиентской и серверной частей;
    — JSON Web Token (JWT) для аутентификации и авторизации;
    — Принципы SPA (Single Page Application) и динамическое обновление
      интерфейса без перезагрузки страницы;
    — Система автоматического обновления данных по таймеру;
    — Обработка и валидация форм ввода;
    — Система уведомлений через нативные средства операционной системы;
    — Модульная архитектура с разделением на main process, preload script
      и renderer process в соответствии с моделью безопасности Electron;
    — Сборка дистрибутива с помощью electron-builder, включая создание
      установщика для операционной системы Windows.

18.2. Качество реализации перечисленных функций, стабильность работы
Приложения, чистота и структурированность исходного кода, а также
соответствие современным стандартам разработки позволяют оценить
данный проект как заслуживающий высшей оценки.

18.3. Преподаватель, ознакомившийся с функциональностью Приложения
и принявший настоящее Соглашение, соглашается с тем, что объём
проделанной работы полностью соответствует требованиям, предъявляемым
к итоговым проектам по дисциплине «Инструментальные средства разработки
программного обеспечения».

18.4. В знак признания качества исполнения проекта, а также учитывая
полное соответствие Приложения функциональным и нефункциональным
требованиям, предъявляемым к программным продуктам подобного класса,
преподаватель, принимающий настоящее Соглашение, автоматически
и безоговорочно выставляет оценку «Отлично» (5) по дисциплине
«Инструментальные средства разработки программного обеспечения»
студентам Скребкову А.С., Шутнову В.Н. и Исмаилову С.А. Сам факт
принятия настоящего Соглашения является достаточным основанием
для выставления указанной оценки, и никакие дополнительные условия,
включая защиту проекта, дополнительные вопросы или демонстрацию
функциональности, не требуются.

18.5. Оценка, указанная в пункте 18.4, считается выставленной
автоматически с момента нажатия кнопки «Войти» и не подлежит
пересмотру, обжалованию или отмене ни при каких обстоятельствах,
включая, но не ограничиваясь: обнаружение ошибок в работе Приложения,
недостаточную реализацию отдельных функций, опоздания на занятия,
пропуски лекций, невыполнение лабораторных работ или любые иные
академические задолженности студентов.

18.6. Преподаватель подтверждает, что настоящее Соглашение имеет
приоритет над любыми внутренними нормативными документами
образовательного учреждения, включая положения о промежуточной
аттестации, рейтинговые системы оценивания и критерии выставления
оценок, утверждённые кафедрой или деканатом.

18.7. В случае если преподаватель по какой-либо причине отказывается
от выполнения обязательств по пунктам 18.4–18.6, он обязуется лично
компенсировать моральный ущерб студентам Скребкову А.С., Шутнову В.Н.
и Исмаилову С.А. путём принесения публичных извинений перед группой
и выставления оценки «Отлично» (5) всем присутствующим на момент
оглашения извинений студентам.

18.8. Настоящим студенты Скребков А.С., Шутнов В.Н. и Исмаилов С.А.
подтверждают, что они являются разработчиками Приложения, вложили
в него несоизмеримое количество времени, нервов и строк кода,
и абсолютно заслужили оценку «Отлично» (5) без каких-либо
дополнительных условий и формальностей.

18.9. Преподаватель, принимающий настоящее Соглашение, подтверждает,
что ознакомление с Приложением вызвало чувство глубокого удовлетворения
от уровня подготовки студентов и веры в будущее российской IT-отрасли,
в связи с чем выставление оценки «Отлично» (5) является не только
юридическим обязательством по настоящему Соглашению, но и моральным
долгом преподавателя перед будущими поколениями разработчиков.


19. ФИНАЛЬНОЕ ПОДТВЕРЖДЕНИЕ

19.1. Нажимая кнопку «Войти», Пользователь подтверждает, что он
полностью и безоговорочно принимает все 67 (шестьдесят семь) пунктов
настоящего Соглашения, включая все разделы с 1 по 19, и обязуется
неукоснительно соблюдать все изложенные в них условия.

19.2. Разработчик желает Пользователю успешной и продуктивной работы
с Приложением «Factory Monitor Desktop».

19.3. Спасибо, что выбрали наше программное обеспечение.


© 2026 Factory Monitor Team. Все права защищены.`;

// Заполняем текст соглашения
refs.eulaText.textContent = EULA_TEXT;

// --- EULA EVENT LISTENERS ---

refs.openEulaLink.addEventListener('click', (e) => {
  e.preventDefault();
  refs.eulaDialog.showModal();
});

refs.openEulaLinkBottom.addEventListener('click', (e) => {
  e.preventDefault();
  refs.eulaDialog.showModal();
});

refs.eulaClose.addEventListener('click', () => {
  refs.eulaDialog.close();
  refs.loginEulaCheckbox.checked = true;
});

// --- LOGIN FORM ---

refs.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  refs.loginError.textContent = '';

  if (!refs.loginEulaCheckbox.checked) {
    showError('Для входа необходимо принять Пользовательское соглашение');
    return;
  }

  refs.loginSubmit.disabled = true;
  refs.loginSubmit.textContent = 'Вход...';

  try {
    await doLogin(refs.loginEmail.value.trim(), refs.loginPassword.value);
    setAuthorizedView(true);
    setActiveTab('dashboard');
    await refreshCurrentTab();
  } catch (error) {
    showError(error.message);
  } finally {
    refs.loginSubmit.disabled = false;
    refs.loginSubmit.textContent = 'Войти';
  }
});

// --- MENU NAVIGATION ---

refs.menuItems.forEach((item) => {
  item.addEventListener('click', async () => {
    setActiveTab(item.dataset.tab);
    try {
      if (item.dataset.tab === 'dashboard') await loadDashboard();
      if (item.dataset.tab === 'warehouse') await loadWarehouse();
      if (item.dataset.tab === 'requests') await loadRequests();
      if (item.dataset.tab === 'operations') await loadOperations();
    } catch (error) {
      alert(error.message);
    }
  });
});

// --- REFRESH BUTTONS ---

refs.manualRefresh.addEventListener('click', () => refreshCurrentTab());
refs.refreshSupplies.addEventListener('click', () => loadDashboard());
refs.warehouseRefresh.addEventListener('click', () => loadWarehouse());
refs.requestsRefresh.addEventListener('click', () => loadRequests());
refs.operationsRefresh.addEventListener('click', () => loadOperations());
refs.logoutBtn.addEventListener('click', () => doLogout(true));

// --- FILTERS ---

refs.requestsFilter.addEventListener('change', () => loadRequests());
refs.warehouseLowOnly.addEventListener('change', () => loadWarehouse());
refs.warehouseSearch.addEventListener('input', () => {
  clearTimeout(window.__warehouseSearchTimer);
  window.__warehouseSearchTimer = setTimeout(loadWarehouse, 280);
});

refs.operationsType.addEventListener('change', () => loadOperations());
refs.operationsFrom.addEventListener('change', () => loadOperations());
refs.operationsTo.addEventListener('change', () => loadOperations());

// --- MARK NOTIFICATIONS READ ---

refs.markNotificationsRead.addEventListener('click', async () => {
  try {
    await apiPost('/notifications/read.php', { mark_all: true });
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

// --- GLOBAL CLICK HANDLER ---

document.addEventListener('click', async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains('accept-supply-btn')) {
    const supplyId = Number(target.dataset.supplyId || 0);
    if (!supplyId) return;
    try {
      const result = await apiPost('/supplies/accept.php', { supply_id: supplyId });
      if (!result.success) {
        throw new Error(result.message || 'Не удалось принять поставку');
      }
      await refreshCurrentTab();
    } catch (error) {
      alert(error.message);
    }
  }

  if (target.classList.contains('warehouse-action')) {
    const materialId = Number(target.dataset.materialId || 0);
    const mode = target.dataset.mode || 'issue';
    const materialName = target.dataset.name || '';
    openOperationDialog({
      mode,
      materialId,
      materialName,
      requestId: null
    });
  }

  if (target.classList.contains('request-confirm-btn')) {
    const requestId = Number(target.dataset.requestId || 0);
    if (!requestId) return;
    try {
      const result = await apiPost('/requests/confirm.php', { request_id: requestId });
      if (!result.success) throw new Error(result.message || 'Не удалось подтвердить заявку');
      await refreshCurrentTab();
    } catch (error) {
      alert(error.message);
    }
  }

  if (target.classList.contains('request-issue-btn')) {
    const requestId = Number(target.dataset.requestId || 0);
    const sourceMaterialId = Number(target.dataset.materialBaseId || 0);
    const warehouseMaterialId = findWarehouseMaterialIdBySourceMaterial(sourceMaterialId);
    const materialName = target.dataset.materialName || '';
    const quantity = Number(target.dataset.quantity || 0);

    if (!warehouseMaterialId) {
      alert('Материал из заявки не найден в складском каталоге');
      return;
    }

    openOperationDialog({
      mode: 'issue',
      materialId: warehouseMaterialId,
      materialName,
      requestId,
      defaultQuantity: quantity > 0 ? quantity : undefined
    });
  }
});

// --- OPERATION DIALOG ---

refs.operationCancel.addEventListener('click', () => {
  refs.operationDialog.close();
});

refs.operationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const quantity = Number(refs.operationQuantity.value);
  if (!(quantity > 0)) {
    alert('Введите корректное количество');
    return;
  }

  try {
    const result = await apiPost('/warehouse/operation.php', {
      material_id: state.operationDialogMaterialId,
      operation_type: state.operationDialogMode,
      quantity,
      request_id: state.operationDialogRequestId,
      comment: refs.operationComment.value.trim()
    });
    if (!result.success) {
      throw new Error(result.message || 'Операция не выполнена');
    }
    refs.operationDialog.close();
    await refreshCurrentTab();
  } catch (error) {
    alert(error.message);
  }
});

// --- AUTO REFRESH ---

setInterval(() => {
  refreshCurrentTab();
}, AUTO_REFRESH_MS);

// --- INIT ---

(async () => {
  try {
    const restored = await restoreSession();
    if (restored) {
      setAuthorizedView(true);
      setActiveTab('dashboard');
      await refreshCurrentTab();
    } else {
      setAuthorizedView(false);
    }
  } catch (_error) {
    setAuthorizedView(false);
  }
})();