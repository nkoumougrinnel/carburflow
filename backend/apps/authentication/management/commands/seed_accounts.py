from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token

from apps.authentication.models import ProfilUtilisateur


DEMO_ACCOUNTS = [
    {
        'username': 'admin',
        'password': 'admin',
        'email': 'admin@carburflow.local',
        'first_name': 'Admin',
        'last_name': 'CarburFlow',
        'role': ProfilUtilisateur.ROLE_ADMIN,
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'username': 'operateur',
        'password': 'operateur123',
        'email': 'operateur@carburflow.local',
        'first_name': 'Agent',
        'last_name': 'Terrain',
        'role': ProfilUtilisateur.ROLE_AGENT,
        'is_staff': False,
        'is_superuser': False,
    },
    {
        'username': 'user',
        'password': 'user123',
        'email': 'user@carburflow.local',
        'first_name': 'Utilisateur',
        'last_name': 'Lecture',
        'role': ProfilUtilisateur.ROLE_USER,
        'is_staff': False,
        'is_superuser': False,
    },
]


class Command(BaseCommand):
    help = 'Crée / met à jour les comptes démo (admin, operateur, user).'

    def handle(self, *args, **options):
        for account in DEMO_ACCOUNTS:
            user, created = User.objects.get_or_create(
                username=account['username'],
                defaults={
                    'email': account['email'],
                    'first_name': account['first_name'],
                    'last_name': account['last_name'],
                    'is_staff': account['is_staff'],
                    'is_superuser': account['is_superuser'],
                },
            )
            user.email = account['email']
            user.first_name = account['first_name']
            user.last_name = account['last_name']
            user.is_staff = account['is_staff']
            user.is_superuser = account['is_superuser']
            user.is_active = True
            user.set_password(account['password'])
            user.save()

            ProfilUtilisateur.objects.update_or_create(
                user=user,
                defaults={'role': account['role']},
            )
            Token.objects.get_or_create(user=user)

            action = 'créé' if created else 'mis à jour'
            self.stdout.write(
                self.style.SUCCESS(
                    f"  {action}: {account['username']} / {account['password']} "
                    f"({account['role']})"
                )
            )

        self.stdout.write(self.style.SUCCESS('Comptes démo prêts.'))
