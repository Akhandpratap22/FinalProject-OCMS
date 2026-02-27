# # from django.db import models
# from django.db import models
# from django.conf import settings

# class Category(models.Model):
#     name = models.CharField(max_length=100)

#     def __str__(self):
#         return self.name


# class Course(models.Model):
#     LEVEL_CHOICES = (
#         ('beginner', 'Beginner'),
#         ('intermediate', 'Intermediate'),
#         ('advanced', 'Advanced'),
#     )

#     title = models.CharField(max_length=200)
#     description = models.TextField()
#     price = models.DecimalField(max_digits=8, decimal_places=2)
#     level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
#     category = models.ForeignKey(Category, on_delete=models.CASCADE)
#     instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return self.title

# Create your models here.
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Course(models.Model):
    LEVEL_CHOICES = (
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
    )

    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='Beginner')
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="courses")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="courses")
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=200)
    order = models.IntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["course", "order"], name="unique_module_order_per_course"),
        ]
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lecture(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="lectures")
    title = models.CharField(max_length=200)
    video_url = models.TextField()
    notes = models.TextField(blank=True, default="")
    order = models.IntegerField(default=1)
    duration = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["module", "order"], name="unique_lecture_order_per_module"),
        ]
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.module.title} - {self.title}"