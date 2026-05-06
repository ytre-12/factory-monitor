"""
Управление темой (светлая/тёмная)
"""

import json
import os

THEME_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'theme.json')


def save_theme(theme):
    """Сохранение темы"""
    with open(THEME_FILE, 'w', encoding='utf-8') as f:
        json.dump({'theme': theme}, f)


def load_theme():
    """Загрузка темы"""
    if os.path.exists(THEME_FILE):
        try:
            with open(THEME_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('theme', 'light')
        except:
            return 'light'
    return 'light'


def apply_theme(app, theme):
    """Применение темы к приложению"""
    from kivy.core.window import Window
    if theme == 'dark':
        Window.clearcolor = (0.1, 0.1, 0.15, 1)
    else:
        Window.clearcolor = (0.95, 0.95, 0.97, 1)

    save_theme(theme)