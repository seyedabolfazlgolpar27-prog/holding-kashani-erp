# Holding Kashani Android RC1

GitHub Actions builds the Android beta APK automatically on pushes affecting `android/**` or the workflow file.

The app asks for the central server HTTPS address on first launch if `SERVER_URL` is not supplied at build time.
