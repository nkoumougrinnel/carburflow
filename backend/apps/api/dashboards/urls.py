from django.urls import path

from .sites import SitesDashboardAPIView
from .groupes import GroupesAPIView
from .cuves import CuvesDashboardAPIView
from .overview import DashboardOverviewAPIView

urlpatterns = [
    path('sites', SitesDashboardAPIView.as_view(), name='dashboard-sites'),
    path('overview', DashboardOverviewAPIView.as_view(), name='dashboard-overview'),
    path('groupes', GroupesAPIView.as_view(), name='dashboard-groupes'),
    path('cuves', CuvesDashboardAPIView.as_view(), name='dashboard-cuves'),
]
