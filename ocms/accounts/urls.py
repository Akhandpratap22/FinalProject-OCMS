from django.urls import path
from .views import register, me
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('register/', register, name='account_register'),
    path('login/', TokenObtainPairView.as_view(), name='account_login'),
    path('refresh/', TokenRefreshView.as_view(), name='account_refresh'),
    path('me/', me, name='account_me'),
]