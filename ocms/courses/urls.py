from django.urls import path
from . import views

urlpatterns = [
    path('', views.course_list, name='course_list'),
    path('categories/', views.category_list, name='category_list'),
    path('<int:pk>/', views.course_detail, name='course_detail'),
    path('create/', views.create_course, name='course_create'),
    path('<int:pk>/update/', views.update_course, name='course_update'),
    path('<int:pk>/delete/', views.delete_course, name='course_delete'),
    
    # Module URLs
    path('<int:course_id>/modules/', views.module_list_create, name='module_list_create'),
    path('<int:course_id>/modules/<int:module_id>/', views.module_detail, name='module_detail'),
    
    # Lecture URLs
    path('<int:course_id>/modules/<int:module_id>/lectures/', views.lecture_list_create, name='lecture_list_create'),
    path('<int:course_id>/modules/<int:module_id>/lectures/<int:lecture_id>/', views.lecture_detail, name='lecture_detail'),
]
