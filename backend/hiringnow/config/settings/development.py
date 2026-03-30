from .base import *

# The DEBUG setting is a boolean that is used to determine if the development server should be run.
DEBUG = True

# The ALLOWED_HOSTS setting is a list of all the hosts that are allowed to access the development server.
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']

# The CORS_ALLOW_ALL_ORIGINS setting is a boolean that is used to determine if all origins are allowed to access the development server.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# The EMAIL_BACKEND setting is the email backend that is used to send emails.
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'