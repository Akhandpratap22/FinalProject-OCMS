from django.urls import path
from . import views


urlpatterns = [
    path('analytics/', views.analytics, name='dashboard_analytics'),
    path('top-courses/', views.top_courses, name='dashboard_top_courses'),
]

