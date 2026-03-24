from rest_framework import serializers
from .models import Course, Category, Module, Lecture


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class LectureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lecture
        fields = '__all__'


class ModuleSerializer(serializers.ModelSerializer):
    lectures = LectureSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = '__all__'


class CourseSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
