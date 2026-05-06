"""
Экран авторизации
"""

from kivy.uix.screenmanager import Screen
from kivy.properties import StringProperty, BooleanProperty
from kivy.clock import Clock


class LoginScreen(Screen):
    """Экран входа в систему"""

    email = StringProperty('')
    password = StringProperty('')
    error_message = StringProperty('')
    loading = BooleanProperty(False)

    def do_login(self):
        """Выполнить вход"""
        if self.loading:
            return

        if not self.email or not self.password:
            self.error_message = 'Заполните email и пароль'
            return

        self.loading = True
        self.error_message = ''

        Clock.schedule_once(lambda dt: self._login(), 0.1)

    def _login(self):
        from utils.api import login

        response = login(self.email, self.password)

        if response.get('success'):
            role = response.get('role')
            if role == 'operator':
                self.manager.current = 'operator'
            elif role == 'repairman':
                self.manager.current = 'repairman'
            else:
                self.error_message = 'Неизвестная роль'
            self.clear_form()
        else:
            self.error_message = response.get('message', 'Ошибка входа')

        self.loading = False

    def clear_form(self):
        """Очистить форму"""
        self.email = ''
        self.password = ''
        self.error_message = ''