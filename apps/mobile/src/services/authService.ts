import api from './api';

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (
    email: string,
    username: string,
    displayName: string,
    password: string,
  ): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/auth/register', {
      email,
      username,
      displayName,
      password,
    });
    return response.data;
  },

  refreshToken: async (token: string): Promise<RefreshResponse> => {
    const response = await api.post<RefreshResponse>('/auth/refresh', {
      refreshToken: token,
    });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },
};

export default authService;
