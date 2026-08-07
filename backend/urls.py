"""
URL racine legacy — NE PLUS UTILISER.

L'URL conf active est `core.urls` (cf. `core/settings/base.py`:
`ROOT_URLCONF = 'core.urls'`). Ce fichier reste uniquement pour
éviter un ImportError si une configuration héritée le pointe encore
par accident. Il délègue à `core.urls` pour garantir la cohérence.
"""
from django.urls import include, path

urlpatterns = [
    path('', include('core.urls')),
]
