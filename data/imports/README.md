# Imports CSV — format attendu par `python manage.py import_data`

users.csv
  username,email,password,role,first_name,last_name,site

sites.csv
  nom,localisation,statut

cuves_principales.csv
  identifiant,site,capacite
  # identifiant = CPxxx (ex. CP001)

groupes.csv
  identifiant,marque,puissance

cuves_journalieres.csv
  identifiant,cuve_principale,capacite
  # identifiant = CJxxx (ex. CJ001)
  # cuve_principale = CPxxx

cuve_journaliere_groupe.csv
  cuve_journaliere,groupe
  # cuve_journaliere = CJxxx
  # groupe = identifiant groupe (ex. G1-SDMO-830)

lignes_rapport.csv
  date_debut,date_fin,cuve_journaliere,cuve_principale,groupe,
  quantite_cuve_principale,quantite_cuve_journaliere,depotage,
  compteur_horaire,etat_fonctionnement,observations
  # cuve_journaliere = CJxxx ; cuve_principale = CPxxx
