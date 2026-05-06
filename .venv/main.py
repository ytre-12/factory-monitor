from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, FadeTransition
from kivy.core.window import Window
from kivy.lang import Builder
import os

from screens.login_screen import LoginScreen
from screens.operator_screen import OperatorScreen
from screens.repairman_screen import RepairmanScreen
from screens.history_screen import HistoryScreen
from screens.materials_screen import MaterialsScreen
from screens.settings_screen import SettingsScreen


class ScreenManagement(ScreenManager):
    def __init__(self, **kwargs):
        super().__init__(transition=FadeTransition(duration=0.2), **kwargs)


class FactoryMonitorApp(App):
    def build(self):
        # Загружаем KV файлы
        kv_dir = os.path.join(os.path.dirname(__file__), 'kv')
        if os.path.exists(kv_dir):
            for kv_file in os.listdir(kv_dir):
                if kv_file.endswith('.kv'):
                    Builder.load_file(os.path.join(kv_dir, kv_file))
                    print(f'Loaded: {kv_file}')

        Window.size = (360, 640)
        Window.clearcolor = (0.95, 0.95, 0.97, 1)

        sm = ScreenManagement()
        sm.add_widget(LoginScreen(name='login'))
        sm.add_widget(OperatorScreen(name='operator'))
        sm.add_widget(RepairmanScreen(name='repairman'))
        sm.add_widget(HistoryScreen(name='history'))
        sm.add_widget(MaterialsScreen(name='materials'))
        sm.add_widget(SettingsScreen(name='settings'))

        return sm


if __name__ == '__main__':
    FactoryMonitorApp().run()
