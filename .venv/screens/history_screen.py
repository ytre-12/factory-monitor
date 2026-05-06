"""
History screen for operator and repairman.
"""

from kivy.clock import Clock
from kivy.properties import ListProperty, StringProperty, BooleanProperty
from kivy.uix.screenmanager import Screen


class HistoryScreen(Screen):
    history = ListProperty([])
    loading = BooleanProperty(True)
    error_message = StringProperty('')
    title = StringProperty('История')
    mode = StringProperty('operator')

    def on_enter(self):
        from utils.api import user_role

        self.mode = user_role if user_role else 'operator'
        self.refresh()

    def refresh(self, _dt=0):
        if self.mode == 'operator':
            self.title = 'История оператора'
            self.load_operator_requests()
        else:
            self.title = 'История ремонтов'
            self.load_repair_history()

    def load_operator_requests(self):
        self.loading = True
        Clock.schedule_once(lambda _dt: self._load_operator_requests(), 0.1)

    def _load_operator_requests(self):
        from utils.api import get_operator_requests

        response = get_operator_requests()
        if response.get('success'):
            self.history = response.get('requests', [])
            self.error_message = ''
        else:
            self.error_message = response.get('message', 'Ошибка загрузки')
            if response.get('status_code') == 401:
                self.manager.current = 'login'
            elif response.get('status_code') != 429:
                self.history = []
        self.loading = False

    def load_repair_history(self):
        self.loading = True
        Clock.schedule_once(lambda _dt: self._load_repair_history(), 0.1)

    def _load_repair_history(self):
        from utils.api import get_repair_history

        response = get_repair_history()
        if response.get('success'):
            self.history = response.get('history', [])
            self.error_message = ''
        else:
            self.error_message = response.get('message', 'Ошибка загрузки')
            if response.get('status_code') == 401:
                self.manager.current = 'login'
            elif response.get('status_code') != 429:
                self.history = []
        self.loading = False

    def get_type_label(self, req_type):
        labels = {
            'start': 'Запуск',
            'stop': 'Остановка',
            'breakdown': 'Поломка',
            'material': 'Материалы',
            'repair': 'Ремонт',
        }
        return labels.get(req_type, str(req_type))

    def get_status_label(self, status_id):
        statuses = {
            1: 'Новая',
            2: 'В работе',
            3: 'Выполнена',
            4: 'Отменена',
        }
        return statuses.get(status_id, 'Неизвестно')

    def go_back(self):
        from utils.api import user_role

        if user_role == 'operator':
            self.manager.current = 'operator'
        else:
            self.manager.current = 'repairman'
