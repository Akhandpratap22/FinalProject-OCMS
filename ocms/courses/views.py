# from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.cache import cache_page
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Course
from .serializers import CourseSerializer

# Create your views here.
@api_view(['GET'])
@permission_classes([AllowAny])  # public course list with Redis cache
@cache_page(60 * 5)  # Redis cache for 5 minutes
def course_list(request):

    courses = Course.objects.all()

    # 🔹 Filtering
    category = request.GET.get('category')
    level = request.GET.get('level')

    if category:
        courses = courses.filter(category_id=category)

    if level:
        courses = courses.filter(level=level)

    # 🔹 Search
    search = request.GET.get('search')
    if search:
        courses = courses.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search)
        )

    # 🔹 Ordering
    ordering = request.GET.get('ordering')
    if ordering:
        courses = courses.order_by(ordering)

    # 🔹 Pagination
    page = request.GET.get('page', 1)
    paginator = Paginator(courses, 5)
    page_obj = paginator.get_page(page)

    serializer = CourseSerializer(page_obj, many=True)

    return Response({
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "results": serializer.data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_detail(request, pk):

    try:
        course = Course.objects.get(pk=pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    serializer = CourseSerializer(course)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_course(request):

    if request.user.role != "INSTRUCTOR":
        return Response({"error": "Only instructors can create courses"}, status=403)

    serializer = CourseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(instructor=request.user)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_course(request, pk):

    try:
        course = Course.objects.get(pk=pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    if request.user != course.instructor:
        return Response({"error": "Not allowed"}, status=403)

    serializer = CourseSerializer(course, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=400)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_course(request, pk):

    try:
        course = Course.objects.get(pk=pk)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    if request.user != course.instructor:
        return Response({"error": "Not allowed"}, status=403)

    course.delete()
    return Response({"message": "Course deleted successfully"})


# Module Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def module_list_create(request, course_id):
    """List all modules for a course or create a new module."""
    from .models import Module
    from .serializers import ModuleSerializer

    if request.method == 'GET':
        modules = Module.objects.filter(course_id=course_id).order_by('order')
        serializer = ModuleSerializer(modules, many=True)
        return Response(serializer.data)

    # POST - Create module
    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    if request.user != course.instructor:
        return Response({"error": "Only instructor can add modules"}, status=403)

    serializer = ModuleSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(course=course)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def module_detail(request, course_id, module_id):
    """Get, update, or delete a specific module."""
    from .models import Module
    from .serializers import ModuleSerializer

    try:
        module = Module.objects.get(pk=module_id, course_id=course_id)
    except Module.DoesNotExist:
        return Response({"error": "Module not found"}, status=404)

    if request.method == 'GET':
        serializer = ModuleSerializer(module)
        return Response(serializer.data)

    # Check instructor permission
    if request.user != module.course.instructor:
        return Response({"error": "Not allowed"}, status=403)

    if request.method == 'PUT':
        serializer = ModuleSerializer(module, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        module.delete()
        return Response({"message": "Module deleted successfully"})


# Lecture Views
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def lecture_list_create(request, course_id, module_id):
    """List all lectures for a module or create a new lecture."""
    from .models import Module, Lecture
    from .serializers import LectureSerializer

    if request.method == 'GET':
        lectures = Lecture.objects.filter(module_id=module_id).order_by('order')
        serializer = LectureSerializer(lectures, many=True)
        return Response(serializer.data)

    # POST - Create lecture
    try:
        module = Module.objects.get(pk=module_id, course_id=course_id)
    except Module.DoesNotExist:
        return Response({"error": "Module not found"}, status=404)

    if request.user != module.course.instructor:
        return Response({"error": "Only instructor can add lectures"}, status=403)

    serializer = LectureSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(module=module)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def lecture_detail(request, course_id, module_id, lecture_id):
    """Get, update, or delete a specific lecture."""
    from .models import Lecture
    from .serializers import LectureSerializer

    try:
        lecture = Lecture.objects.get(pk=lecture_id, module_id=module_id, module__course_id=course_id)
    except Lecture.DoesNotExist:
        return Response({"error": "Lecture not found"}, status=404)

    if request.method == 'GET':
        serializer = LectureSerializer(lecture)
        return Response(serializer.data)

    # Check instructor permission
    if request.user != lecture.module.course.instructor:
        return Response({"error": "Not allowed"}, status=403)

    if request.method == 'PUT':
        serializer = LectureSerializer(lecture, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == 'DELETE':
        lecture.delete()
        return Response({"message": "Lecture deleted successfully"})


# Category Views
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def category_list(request):
    """List all categories or create a new category."""
    from .models import Category
    from .serializers import CategorySerializer

    if request.method == 'GET':
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)

    # POST - Create category (only for instructors/admins)
    if not request.user.is_authenticated or request.user.role not in ['INSTRUCTOR', 'ADMIN']:
        return Response({"error": "Only instructors or admins can create categories"}, status=403)

    serializer = CategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)
