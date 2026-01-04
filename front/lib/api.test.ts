import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from './api';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('ApiClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should make a GET request and return JSON', async () => {
    const mockResponse = { id: 1, name: 'Test' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await api.getSchedule('uuid-123');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/schedules/uuid-123/'),
      expect.objectContaining({
        method: undefined, // GET is default
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not found' }),
    });

    await expect(api.getSchedule('invalid')).rejects.toThrow(ApiError);
    await expect(api.getSchedule('invalid')).rejects.toThrow('Not found');
  });

  it('should build query strings for getSchedules', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await api.getSchedules({ page: 2, search: 'meeting' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/schedules/?page=2&search=meeting'),
      expect.any(Object)
    );
  });

  it('should handle 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    const result = await api.deleteSchedule('uuid-123');
    expect(result).toEqual({});
  });
});
