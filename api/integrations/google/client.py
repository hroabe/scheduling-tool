"""
Google Calendar API Client
RFC-0001: Googleカレンダー連携

Provides OAuth flow and Calendar API operations.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


# Google OAuth2 endpoints
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

# Scopes needed for calendar operations
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
]


class GoogleCalendarError(Exception):
    """Google Calendar API error"""
    pass


class GoogleCalendarClient:
    """
    Google Calendar API クライアント
    
    OAuth認証とカレンダー操作を提供
    """
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Google Calendar API"""
        url = f'{GOOGLE_CALENDAR_API_BASE}{endpoint}'
        
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json() if response.content else {}
        except requests.exceptions.HTTPError as e:
            logger.error(f'Google Calendar API error: {e.response.status_code} - {e.response.text}')
            raise GoogleCalendarError(f'API error: {e.response.status_code}')
        except requests.exceptions.RequestException as e:
            logger.error(f'Google Calendar request failed: {e}')
            raise GoogleCalendarError(f'Request failed: {e}')
    
    def get_calendars(self) -> List[Dict[str, Any]]:
        """Get list of user's calendars"""
        result = self._request('GET', '/users/me/calendarList')
        return result.get('items', [])
    
    def get_freebusy(
        self,
        time_min: datetime,
        time_max: datetime,
        calendar_ids: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, str]]]:
        """
        Get free/busy information for calendars
        
        Args:
            time_min: Start of time range
            time_max: End of time range
            calendar_ids: List of calendar IDs to check (default: primary)
            
        Returns:
            Dict mapping calendar ID to list of busy periods
        """
        if calendar_ids is None:
            calendar_ids = ['primary']
        
        body = {
            'timeMin': time_min.isoformat(),
            'timeMax': time_max.isoformat(),
            'items': [{'id': cal_id} for cal_id in calendar_ids],
        }
        
        result = self._request('POST', '/freeBusy', json=body)
        
        calendars = result.get('calendars', {})
        return {
            cal_id: cal_data.get('busy', [])
            for cal_id, cal_data in calendars.items()
        }
    
    def create_event(
        self,
        summary: str,
        start: datetime,
        end: datetime,
        description: str = '',
        attendees: Optional[List[str]] = None,
        calendar_id: str = 'primary',
        add_google_meet: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a calendar event
        
        Args:
            summary: Event title
            start: Start datetime
            end: End datetime
            description: Event description
            attendees: List of attendee email addresses
            calendar_id: Calendar to create event in
            add_google_meet: Whether to add Google Meet link
            
        Returns:
            Created event data including hangoutLink if Meet was added
        """
        event = {
            'summary': summary,
            'description': description,
            'start': {
                'dateTime': start.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
            'end': {
                'dateTime': end.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
        }
        
        if attendees:
            event['attendees'] = [{'email': email} for email in attendees]
        
        if add_google_meet:
            event['conferenceData'] = {
                'createRequest': {
                    'requestId': f'meet-{timezone.now().timestamp()}',
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                },
            }
        
        # conferenceDataVersion=1 is required to create Google Meet
        params = {'conferenceDataVersion': 1} if add_google_meet else {}
        
        result = self._request(
            'POST',
            f'/calendars/{calendar_id}/events',
            json=event,
            params=params,
        )
        
        logger.info(f'Created Google Calendar event: {result.get("id")}')
        return result
    
    def get_event(self, event_id: str, calendar_id: str = 'primary') -> Dict[str, Any]:
        """Get a specific event"""
        return self._request('GET', f'/calendars/{calendar_id}/events/{event_id}')
    
    def delete_event(self, event_id: str, calendar_id: str = 'primary') -> None:
        """Delete an event"""
        self._request('DELETE', f'/calendars/{calendar_id}/events/{event_id}')
        logger.info(f'Deleted Google Calendar event: {event_id}')


def get_oauth_url(state: str) -> str:
    """
    Generate Google OAuth authorization URL
    
    Args:
        state: State parameter for CSRF protection
        
    Returns:
        Authorization URL to redirect user to
    """
    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
        'response_type': 'code',
        'scope': ' '.join(GOOGLE_SCOPES),
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state,
    }
    return f'{GOOGLE_AUTH_URL}?{urlencode(params)}'


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access and refresh tokens
    
    Args:
        code: Authorization code from OAuth callback
        
    Returns:
        Token response containing access_token, refresh_token, expires_in
    """
    data = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': settings.GOOGLE_REDIRECT_URI,
    }
    
    response = requests.post(GOOGLE_TOKEN_URL, data=data)
    
    if not response.ok:
        logger.error(f'Token exchange failed: {response.status_code} - {response.text}')
        raise GoogleCalendarError(f'Token exchange failed: {response.status_code}')
    
    return response.json()


def refresh_access_token(refresh_token: str) -> Dict[str, Any]:
    """
    Refresh an access token using refresh token
    
    Args:
        refresh_token: Refresh token from initial OAuth
        
    Returns:
        New token response containing access_token, expires_in
    """
    data = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'refresh_token': refresh_token,
        'grant_type': 'refresh_token',
    }
    
    response = requests.post(GOOGLE_TOKEN_URL, data=data)
    
    if not response.ok:
        logger.error(f'Token refresh failed: {response.status_code} - {response.text}')
        raise GoogleCalendarError(f'Token refresh failed: {response.status_code}')
    
    return response.json()
