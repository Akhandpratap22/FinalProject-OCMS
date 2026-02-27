from django.urls import path
from . import views


urlpatterns = [
    path('courses/<int:course_id>/reviews/', views.course_reviews, name='course_reviews'),
    path('courses/<int:course_id>/reviews/create/', views.create_review, name='create_review'),
]

