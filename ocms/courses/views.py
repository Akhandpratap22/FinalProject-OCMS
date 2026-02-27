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
