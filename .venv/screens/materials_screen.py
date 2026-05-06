"""
Materials request screen.
"""

from kivy.clock import Clock
from kivy.properties import ListProperty, StringProperty, BooleanProperty, NumericProperty
from kivy.uix.screenmanager import Screen


class MaterialsScreen(Screen):
    materials = ListProperty([])
    loading = BooleanProperty(True)
    error_message = StringProperty('')
    selected_material_id = NumericProperty(0)
    selected_material_name = StringProperty('')
    quantity = StringProperty('1')

    def on_enter(self):
        self.refresh()

    def refresh(self, _dt=0):
        self.load_materials(force_api=True)

    def load_materials(self, force_api=False):
        from utils.cache import get_materials as get_cached_materials

        self.loading = True
        self.error_message = ''

        if not force_api:
            cached = get_cached_materials()
            if cached:
                self.materials = cached
                self.loading = False
                return

        Clock.schedule_once(lambda _dt: self._load_from_api(), 0.1)

    def _load_from_api(self):
        from utils.api import get_materials
        from utils.cache import save_references

        response = get_materials()
        if response.get('success'):
            self.materials = response.get('materials', [])
            save_references(self.materials)
            self.error_message = ''
        else:
            self.error_message = response.get('message', 'Ошибка загрузки')
            if response.get('status_code') == 401:
                self.manager.current = 'login'
            elif response.get('status_code') != 429:
                self.materials = []
        self.loading = False

    def select_material(self, material_id, material_name):
        self.selected_material_id = material_id
        self.selected_material_name = material_name
        self.error_message = ''

    def send_request(self):
        if not self.selected_material_id:
            self.error_message = 'Выберите материал'
            return

        try:
            qty = int(self.quantity)
            if qty <= 0:
                raise ValueError
        except ValueError:
            self.error_message = 'Введите корректное количество'
            return

        from utils.api import send_material_request
        from kivy.uix.popup import Popup
        from kivy.uix.label import Label

        self.loading = True
        response = send_material_request(self.selected_material_id, qty)

        if response.get('success'):
            popup = Popup(
                title='Успех',
                content=Label(text='Заявка на материалы отправлена', halign='center'),
                size_hint=(0.78, 0.28)
            )
            popup.open()
            Clock.schedule_once(lambda _dt: popup.dismiss(), 2)
            Clock.schedule_once(lambda _dt: self.go_back(), 2)
        else:
            self.error_message = response.get('message', 'Ошибка отправки')
            if response.get('status_code') == 401:
                self.manager.current = 'login'

        self.loading = False

    def go_back(self):
        self.selected_material_id = 0
        self.selected_material_name = ''
        self.quantity = '1'
        self.error_message = ''
        self.manager.current = 'operator'
