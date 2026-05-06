"""
Repairman screen with less frequent API polling.
"""

from kivy.clock import Clock
from kivy.properties import ListProperty, StringProperty, BooleanProperty, NumericProperty
from kivy.uix.screenmanager import Screen


class RepairmanScreen(Screen):
    breakdowns = ListProperty([])
    loading = BooleanProperty(True)
    error_message = StringProperty('')
    polling_interval_seconds = NumericProperty(300)

    def on_enter(self):
        self.load_breakdowns()
        Clock.schedule_interval(self.refresh, self.polling_interval_seconds)

    def on_leave(self):
        Clock.unschedule(self.refresh)

    def refresh(self, _dt=0):
        self.load_breakdowns()

    def load_breakdowns(self):
        self.loading = True
        Clock.schedule_once(lambda _dt: self._load_breakdowns(), 0.1)

    def _load_breakdowns(self):
        from utils.api import get_breakdowns

        response = get_breakdowns()
        if response.get('success'):
            self.breakdowns = response.get('breakdowns', [])
            self.error_message = ''
        else:
            self.error_message = response.get('message', 'Ошибка загрузки')
            if response.get('status_code') == 401:
                self.manager.current = 'login'
            elif response.get('status_code') != 429:
                self.breakdowns = []

        self.loading = False

    def assign_breakdown(self, request_id):
        from utils.api import assign_breakdown

        response = assign_breakdown(request_id)
        self._handle_response(response, 'Заявка взята в работу')

    def fix_breakdown(self, request_id, station_name):
        from kivy.uix.popup import Popup
        from kivy.uix.boxlayout import BoxLayout
        from kivy.uix.label import Label
        from kivy.uix.button import Button

        layout = BoxLayout(orientation='vertical', padding=12, spacing=12)
        layout.add_widget(
            Label(
                text=f'Подтвердите ремонт оборудования "{station_name}"',
                text_size=(320, None),
                halign='center',
                valign='middle'
            )
        )

        btn_layout = BoxLayout(size_hint_y=None, height=48, spacing=10)

        def confirm(_instance):
            popup.dismiss()
            from utils.api import fix_breakdown
            response = fix_breakdown(request_id)
            self._handle_response(response, f'Ремонт "{station_name}" завершен')

        cancel_btn = Button(text='Отмена')
        cancel_btn.bind(on_press=lambda _x: popup.dismiss())
        confirm_btn = Button(text='Подтвердить', background_color=(0.15, 0.68, 0.31, 1))
        confirm_btn.bind(on_press=confirm)

        btn_layout.add_widget(cancel_btn)
        btn_layout.add_widget(confirm_btn)
        layout.add_widget(btn_layout)

        popup = Popup(title='Подтверждение', content=layout, size_hint=(0.88, 0.35))
        popup.open()

    def _handle_response(self, response, success_message):
        from kivy.uix.popup import Popup
        from kivy.uix.label import Label

        if response.get('success'):
            message = f'Успех: {success_message}'
            Clock.schedule_once(lambda _dt: self.load_breakdowns(), 0.6)
        else:
            message = f'Ошибка: {response.get("message", "Неизвестная ошибка")}'
            if response.get('status_code') == 401:
                self.manager.current = 'login'

        popup = Popup(
            title='Результат',
            content=Label(text=message, text_size=(280, None), halign='center'),
            size_hint=(0.8, 0.28)
        )
        popup.open()
        Clock.schedule_once(lambda _dt: popup.dismiss(), 2.2)

    def go_to_history(self):
        self.manager.current = 'history'

    def go_to_settings(self):
        self.manager.current = 'settings'

    def logout(self):
        from utils.api import logout
        logout()
        self.manager.current = 'login'
