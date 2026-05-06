"""
Главный экран оператора.
"""

from kivy.clock import Clock
from kivy.properties import StringProperty, BooleanProperty, ListProperty, NumericProperty
from kivy.uix.screenmanager import Screen


class OperatorScreen(Screen):
    station_name = StringProperty('Загрузка...')
    station_status = StringProperty('')
    status_text = StringProperty('Загрузка...')
    status_color = ListProperty([0.5, 0.5, 0.5, 1])
    is_loading = BooleanProperty(True)
    has_station = BooleanProperty(True)
    polling_interval_seconds = NumericProperty(300)

    def on_enter(self):
        self.load_station_data()
        Clock.schedule_interval(self.update_status, self.polling_interval_seconds)

    def on_leave(self):
        Clock.unschedule(self.update_status)

    def load_station_data(self):
        self.is_loading = True
        Clock.schedule_once(lambda _dt: self._load_station(), 0.1)

    def _load_station(self):
        from utils.api import get_operator_station

        response = get_operator_station()
        if response.get('success'):
            station = response.get('station')
            if station:
                self.station_name = station.get('name', 'Неизвестно')
                self.set_status(station.get('status', 'idle'))
                self.has_station = True
            else:
                self.has_station = False
                self.station_name = 'Станок не назначен'
                self.status_text = 'Обратитесь к администратору'
                self.status_color = [1, 0.5, 0, 1]
        else:
            self._handle_station_error(response)

        self.is_loading = False

    def set_status(self, status):
        status_map = {
            'working': ('Работает', [0.2, 0.78, 0.35, 1]),
            'idle': ('Простаивает', [0.95, 0.76, 0.06, 1]),
            'broken': ('Сломан', [1, 0.3, 0.3, 1]),
            'maintenance': ('На обслуживании', [0.3, 0.3, 1, 1]),
        }
        self.station_status = status
        text, color = status_map.get(status, ('Неизвестно', [0.5, 0.5, 0.5, 1]))
        self.status_text = text
        self.status_color = color

    def update_status(self, _dt):
        if not self.has_station:
            return

        from utils.api import get_operator_station

        response = get_operator_station()
        if response.get('success') and response.get('station'):
            station = response['station']
            new_status = station.get('status')
            if station.get('name'):
                self.station_name = station.get('name')
            if new_status and new_status != self.station_status:
                self.set_status(new_status)
            return

        if response.get('status_code') == 429:
            self.status_text = response.get('message', 'Слишком много запросов. Подождите...')
            self.status_color = [0.95, 0.76, 0.06, 1]
        elif response.get('status_code') == 401:
            self.manager.current = 'login'

    def _handle_station_error(self, response):
        message = (response.get('message') or '').lower()
        status_code = response.get('status_code')

        if status_code == 401 or 'не авторизован' in message:
            self.manager.current = 'login'
            return

        if status_code == 429 or '429' in message:
            self.station_name = 'Временная блокировка'
            self.status_text = response.get('message', 'Слишком много запросов. Подождите...')
            self.status_color = [0.95, 0.76, 0.06, 1]
            return

        if 'станок не назначен' in message:
            self.has_station = False
            self.station_name = 'Станок не назначен'
            self.status_text = 'Обратитесь к администратору'
            self.status_color = [1, 0.5, 0, 1]
            return

        self.station_name = 'Ошибка загрузки'
        self.status_text = response.get('message', 'Не удалось загрузить данные')
        self.status_color = [1, 0.3, 0.3, 1]

    def send_start(self):
        from utils.api import send_start
        response = send_start()
        self._handle_response(response, 'запуск')

    def send_stop(self):
        from utils.api import send_stop
        response = send_stop()
        self._handle_response(response, 'остановка')

    def send_breakdown(self):
        from kivy.uix.popup import Popup
        from kivy.uix.boxlayout import BoxLayout
        from kivy.uix.textinput import TextInput
        from kivy.uix.button import Button

        layout = BoxLayout(orientation='vertical', padding=10, spacing=10)
        text_input = TextInput(
            hint_text='Опишите проблему...',
            multiline=True,
            size_hint_y=None,
            height=100
        )

        def submit(_instance):
            description = text_input.text.strip()
            if description:
                popup.dismiss()
                response = self._send_breakdown(description)
                self._handle_response(response, 'поломка')

        btn_layout = BoxLayout(size_hint_y=None, height=50, spacing=10)
        cancel_btn = Button(text='Отмена')
        cancel_btn.bind(on_press=lambda _x: popup.dismiss())
        submit_btn = Button(text='Отправить', background_color=(0.2, 0.78, 0.35, 1))
        submit_btn.bind(on_press=submit)
        btn_layout.add_widget(cancel_btn)
        btn_layout.add_widget(submit_btn)

        layout.add_widget(text_input)
        layout.add_widget(btn_layout)

        popup = Popup(title='Сообщить о поломке', content=layout, size_hint=(0.8, 0.5))
        popup.open()

    def _send_breakdown(self, description):
        from utils.api import send_breakdown
        return send_breakdown(description)

    def open_materials(self):
        self.manager.current = 'materials'

    def _handle_response(self, response, action_name):
        from kivy.uix.popup import Popup
        from kivy.uix.label import Label

        if response.get('success'):
            message = f'✅ {action_name} выполнен успешно'
            Clock.schedule_once(lambda _dt: self.update_status(0), 1)
        else:
            message = f'❌ Ошибка: {response.get("message", "Неизвестная ошибка")}'

        popup = Popup(title='Результат', content=Label(text=message), size_hint=(0.7, 0.3))
        popup.open()
        Clock.schedule_once(lambda _dt: popup.dismiss(), 2)

    def go_to_history(self):
        self.manager.current = 'history'

    def go_to_settings(self):
        self.manager.current = 'settings'

    def logout(self):
        from utils.api import logout
        logout()
        self.manager.current = 'login'
