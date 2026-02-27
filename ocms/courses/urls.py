from django.urls import path
from . import views

urlpatterns = [
    path('', views.course_list, name='course_list'),
    path('<int:pk>/', views.course_detail, name='course_detail'),
    path('create/', views.create_course, name='course_create'),
    path('<int:pk>/update/', views.update_course, name='course_update'),
    path('<int:pk>/delete/', views.delete_course, name='course_delete'),
]