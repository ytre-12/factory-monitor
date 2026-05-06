[app]

title = Factory Monitor
package.name = factorymonitor
package.domain = org.factorymonitor

source.dir = .
source.include_exts = py,png,jpg,kv,atlas

version = 1.0.0
requirements = python3,kivy,requests,plyer,android

orientation = portrait
fullscreen = 1

android.permissions = INTERNET, VIBRATE

android.api = 33
android.minapi = 21
android.ndk = 23b
android.sdk = 33

android.archs = arm64-v8a

ios.kivy_ios_url = git@github.com:kivy/kivy-ios.git

[buildozer]

log_level = 2

warn_on_root = 1