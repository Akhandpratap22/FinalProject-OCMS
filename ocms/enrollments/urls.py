from django.urls import path
from . import views


urlpatterns = [
    path('me/', views.my_enrollments, name='my_enrollments'),
    path('courses/<int:course_id>/enroll/', views.enroll_in_course, name='enroll_in_course'),
    path('<int:enrollment_id>/progress/', views.enrollment_progress, name='enrollment_progress'),
    path('<int:enrollment_id>/lectures/<int:lecture_id>/complete/', views.mark_lecture_completed, name='mark_lecture_completed'),
]

