"""
Check Email Endpoint

Checks if an email address is already registered.
Used for unified login/signup flow.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth.models import User


class CheckEmailView(APIView):
    """
    Check if email exists
    
    POST /api/v1/accounts/check-email/
    
    Request: { "email": "user@example.com" }
    Response: { "exists": true/false }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        
        if not email:
            return Response({'exists': False})
        
        exists = User.objects.filter(email__iexact=email).exists()
        
        return Response({'exists': exists})
