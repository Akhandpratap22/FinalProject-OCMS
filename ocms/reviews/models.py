# from django.db import models

# # Create your models here.
from django.db import models
from django.conf import settings
from courses.models import Course
from django.utils import timezone

class Review(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('student', 'course')