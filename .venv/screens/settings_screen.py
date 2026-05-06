"""
Экран настроек
"""

from kivy.uix.screenmanager import Screen
from kivy.properties import BooleanProperty
from kivy.clock import Clock


class SettingsScreen(Screen):
    """Экран настроек приложения"""

    is_dark_theme = BooleanProperty(False)

    def on_enter(self):
        """При входе на экран"""
        from utils.theme import load_theme
        self.is_dark_theme = load_theme() == 'dark'

    def toggle_theme(self):
        """Переключение темы"""
        from utils.theme import apply_theme, load_theme
        from kivy.app import App

        new_theme = 'dark' if self.is_dark_theme else 'light'
        apply_theme(App.get_running_app(), new_theme)

        # Принудительное обновление цветов в интерфейсе
        self.is_dark_theme = new_theme == 'dark'

        # Перезагрузка текущего экрана для обновления цветов
        current = self.manager.current
        Clock.schedule_once(lambda dt: self._refresh_screen(current), 0.1)

    def _refresh_screen(self, screen_name):
        """Обновление экрана"""
        self.manager.current = screen_name

    def clear_cache(self):
        """Очистка кэша"""
        from utils.cache import clear_cache
        clear_cache()

        from kivy.uix.popup import Popup
        from kivy.uix.label import Label
        popup = Popup(title='Очистка кэша', content=Label(text='✅ Кэш очищен'), size_hint=(0.7, 0.3))
        popup.open()
        Clock.schedule_once(lambda dt: popup.dismiss(), 2)

    def about(self):
        """Информация о приложении"""
        from kivy.uix.popup import Popup
        from kivy.uix.label import Label

        about_text = (
            "Factory Monitor\n"
            "Версия 1.0.0\n\n"
            "Система анализа простоев оборудования\n\n"
            "Разработчики:\n"
            "• Исмаилов С.\n"
            "• Скребков А.\n"
            "• Шутнов В.\n\n"
            "© 2026"
        )
        popup = Popup(title='О приложении', content=Label(text=about_text), size_hint=(0.8, 0.5))
        popup.open()

    def go_back(self):
        """Вернуться назад"""
        from utils.api import user_role
        if user_role == 'operator':
            self.manager.current = 'operator'
        elif user_role == 'repairman':
            self.manager.current = 'repairman'
        else:
            self.manager.current = 'login'