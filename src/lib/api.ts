const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const data = await response.json();
          if (data.errors && Array.isArray(data.errors)) {
            errorMessage = data.errors.map((e: any) => e.msg).join(', ');
          } else {
            errorMessage = data.error || errorMessage;
          }
        } catch {
          errorMessage = `Request failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('API request failed:', error);
      if (error.message) {
        throw error;
      }
      throw new Error('Network error. Please check if the server is running.');
    }
  }

  // Auth methods
  async register(email: string, password: string, fullName: string) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  async verifyEmail(token: string) {
    const data = await this.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  async resendVerification(email: string) {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    
    return data;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Project methods
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(name: string, description?: string, color?: string) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, color }),
    });
  }

  async getProject(id: number) {
    return this.request(`/projects/${id}`);
  }

  async updateProject(id: number, updates: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: number) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Column methods
  async getColumns(projectId: number) {
    return this.request(`/columns/project/${projectId}`);
  }

  async createColumn(name: string, projectId: number, color?: string, position?: number) {
    return this.request('/columns', {
      method: 'POST',
      body: JSON.stringify({ name, project_id: projectId, color, position }),
    });
  }

  async updateColumn(id: number, updates: any) {
    return this.request(`/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteColumn(id: number) {
    return this.request(`/columns/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderColumns(projectId: number, columns: { id: number; position: number }[]) {
    return this.request('/columns/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ projectId, columns }),
    });
  }

  // Task methods
  async getTasks(projectId: number) {
    return this.request(`/tasks/project/${projectId}`);
  }

  async createTask(taskData: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(id: number, updates: any) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: number) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Member methods
  async getMembers(projectId: number) {
    return this.request(`/members/project/${projectId}`);
  }

  async addMember(projectId: number, email: string, role: 'admin' | 'member') {
    return this.request('/members', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, email, role }),
    });
  }

  async updateMemberRole(memberId: number, role: 'admin' | 'member') {
    return this.request(`/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(memberId: number) {
    return this.request(`/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // Role methods
  async getProjectMemberRole(projectId: number): Promise<{ role: string; isOwner: boolean }> {
    const data = await this.request(`/projects/${projectId}/role`);
    return data;
  }

  // Profile methods
  async getProfile() {
    return this.request('/profile');
  }

  async updateName(fullName: string) {
    return this.request('/profile/name', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName }),
    });
  }

  async updateUsername(username: string) {
    return this.request('/profile/username', {
      method: 'PUT',
      body: JSON.stringify({ username }),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string) {
    return this.request('/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  async updateAvatar(avatarUrl: string) {
    return this.request('/profile/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
  }

  async deleteAccount() {
    return this.request('/profile', {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();