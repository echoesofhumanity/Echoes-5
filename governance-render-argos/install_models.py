"""Install only the Turkish-to-English pilot model into the app directory.

Run at build time. No participant text or credentials are involved.
"""
import os
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / '.argos-packages'
os.environ['ARGOS_PACKAGES_DIR'] = str(MODEL_DIR)


def main():
    import argostranslate.package as package
    package.update_package_index()
    matches = [item for item in package.get_available_packages()
               if item.from_code == 'tr' and item.to_code == 'en']
    if not matches:
        raise RuntimeError('Argos tr->en package unavailable')
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    package.install_from_path(matches[0].download())
    print('Installed tr->en pilot model', flush=True)


if __name__ == '__main__':
    main()
