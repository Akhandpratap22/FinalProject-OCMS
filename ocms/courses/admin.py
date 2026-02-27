from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Category, Course, Module, Lecture

admin.site.register(Category)
admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Lecture)