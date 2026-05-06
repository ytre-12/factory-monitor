"""
Кэширование справочников
"""

import json
import os

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache')
CACHE_FILE = os.path.join(CACHE_DIR, 'references.json')


def _ensure_cache_dir():
    """Создание папки для кэша"""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)


def save_references(materials, statuses=None):
    """Сохранение справочников в кэш"""
    _ensure_cache_dir()
    data = {
        'materials': materials,
        'statuses': statuses,
        'version': 1
    }
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_references():
    """Загрузка справочников из кэша"""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    return None


def clear_cache():
    """Очистка кэша"""
    if os.path.exists(CACHE_FILE):
        os.remove(CACHE_FILE)


def get_materials():
    """Получить материалы из кэша или None"""
    data = load_references()
    if data:
        return data.get('materials')
    return None


def update_cache_from_api():
    """Обновить кэш из API"""
    from utils.api import get_materials
    response = get_materials()
    if response.get('success'):
        save_references(response.get('materials', []))
        return True
    return False