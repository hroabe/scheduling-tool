"""
Authentication backends
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailOrUsernameBackend(ModelBackend):
    """Authenticate with either the username or the (case-insensitive) e-mail address."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(get_user_model().USERNAME_FIELD)
        if not username or not password:
            return None

        User = get_user_model()
        user = User.objects.filter(username=username).first()
        if user is None and '@' in username:
            user = User.objects.filter(email__iexact=username.strip()).order_by('id').first()
        if user is None:
            # Run the hasher anyway to reduce timing differences between existing and missing users
            User().set_password(password)
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
