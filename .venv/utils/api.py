"""
API client for communication with mobile backend.
"""

import time
import requests
from plyer import notification

BASE_URL = 'https://sergey1337.pro-web24.ru/api/mobile'
HTTP_SESSION = requests.Session()

auth_token = None
user_id = None
user_role = None
rate_limited_until = 0.0


def set_auth(token, uid, role):
    global auth_token, user_id, user_role
    auth_token = token
    user_id = uid
    user_role = role


def clear_auth():
    global auth_token, user_id, user_role, rate_limited_until
    auth_token = None
    user_id = None
    user_role = None
    rate_limited_until = 0.0
    HTTP_SESSION.cookies.clear()


def is_authenticated():
    return auth_token is not None


def _normalize_endpoint(endpoint):
    endpoint = endpoint.strip()
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint

    path, sep, query = endpoint.partition('?')
    parts = path.split('/')

    if not path.endswith('.php'):
        if len(parts) >= 4 and parts[-1].isdigit():
            path = '/'.join(parts[:-1]) + '.php/' + parts[-1]
        else:
            path = path + '.php'

    return path + (sep + query if sep else '')


def _request(method, endpoint, data=None):
    global rate_limited_until

    now = time.time()
    if now < rate_limited_until:
        wait_seconds = int(rate_limited_until - now) + 1
        return {
            'success': False,
            'status_code': 429,
            'rate_limited': True,
            'message': f'Слишком много запросов. Подождите {wait_seconds} сек.'
        }

    endpoint = _normalize_endpoint(endpoint)
    url = f'{BASE_URL}{endpoint}'
    headers = {
        'Content-Type': 'application/json',
        'X-Auth-Token': auth_token if auth_token else ''
    }

    try:
        if method == 'GET':
            response = HTTP_SESSION.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = HTTP_SESSION.post(url, json=data, headers=headers, timeout=10)
        elif method == 'PUT':
            response = HTTP_SESSION.put(url, json=data, headers=headers, timeout=10)
        else:
            return {'success': False, 'message': 'Неизвестный метод'}

        print(f'DEBUG: {method} {url} -> {response.status_code}')

        if response.status_code == 200:
            return response.json()

        if response.status_code == 429:
            rate_limited_until = time.time() + 20
            return {
                'success': False,
                'status_code': 429,
                'rate_limited': True,
                'message': 'Слишком много запросов. Подождите 20 сек.'
            }

        return {
            'success': False,
            'status_code': response.status_code,
            'message': f'Ошибка {response.status_code}'
        }
    except requests.exceptions.RequestException as exc:
        print(f'DEBUG: Request error: {exc}')
        return {'success': False, 'message': f'Ошибка соединения: {exc}'}


def login(email, password):
    print(f'DEBUG: Login attempt: {email}')
    response = _request('POST', '/auth/login', {'email': email, 'password': password})
    print(f'DEBUG: Login response: {response}')
    if response.get('success'):
        set_auth(response.get('token'), response.get('user_id'), response.get('role'))
    return response


def logout():
    clear_auth()
    return {'success': True}


def get_operator_station():
    return _request('GET', '/operator/station')


def get_operator_requests():
    return _request('GET', '/operator/requests')


def send_start():
    return _request('POST', '/operator/start')


def send_stop():
    return _request('POST', '/operator/stop')


def send_breakdown(description):
    return _request('POST', '/operator/breakdown', {'description': description})


def send_material_request(material_id, quantity):
    return _request('POST', '/operator/material', {'material_id': material_id, 'quantity': quantity})


def get_breakdowns():
    return _request('GET', '/repair/breakdowns')


def get_repair_history():
    return _request('GET', '/repair/history')


def assign_breakdown(request_id):
    return _request('POST', f'/repair/assign?id={request_id}')


def fix_breakdown(request_id):
    return _request('POST', f'/repair/fix?id={request_id}')


def get_materials():
    return _request('GET', '/references/materials')


def check_notifications(_dt):
    if not is_authenticated():
        return

    if user_role == 'operator':
        response = _request('GET', '/operator/notifications')
        if response.get('success') and response.get('notifications'):
            for notif in response['notifications']:
                notification.notify(title='Factory Monitor', message=notif, timeout=3)
    elif user_role == 'repairman':
        response = _request('GET', '/repair/notifications')
        if response.get('success') and response.get('new_breakdowns'):
            notification.notify(
                title='Новая поломка!',
                message=f'Станок {response["new_breakdowns"]} требует ремонта',
                timeout=3
            )


_polling_active = False


def start_polling():
    global _polling_active
    _polling_active = True
    from kivy.clock import Clock
    Clock.schedule_interval(check_notifications, 10)


def stop_polling():
    global _polling_active
    _polling_active = False
