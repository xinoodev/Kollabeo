# Kollabeo - PERN Stack Task Management Platform

A collaborative task management platform built with PostgreSQL, Express.js, React, and Node.js.

## Features

- 🔐 **Authentication**: Secure user registration and login with JWT
- 📋 **Project Management**: Create, edit, and delete projects
- 📊 **Kanban Boards**: Drag and drop tasks between columns
- 🏷️ **Task Organization**: Tags, priorities, and due dates
- 💬 **Collaboration**: Comments and project sharing
- 📱 **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, PostgreSQL
- **Authentication**: JWT tokens, bcrypt password hashing
- **Database**: PostgreSQL with connection pooling
- **Drag & Drop**: @dnd-kit library

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kollabeo
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   ```

3. **Database Setup**
   
   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE kollabeo;
   ```

4. **Environment Configuration**
   
   Copy the example environment file:
   ```bash
   cd server
   cp .env.example .env
   ```
   
   Update the `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=kollabeo
   DB_USER=your_username
   DB_PASSWORD=your_password
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

5. **Run Database Migrations**
   ```bash
   cd server
   npm run migrate
   ```

## Development

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The API will be available at `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Columns
- `GET /api/columns/project/:projectId` - Get project columns
- `POST /api/columns` - Create new column

### Tasks
- `GET /api/tasks/project/:projectId` - Get project tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## Database Schema

The application uses the following main tables:
- `users` - User accounts and authentication
- `projects` - Project information
- `task_columns` - Kanban board columns
- `tasks` - Individual tasks
- `task_comments` - Task comments
- `project_members` - Project collaboration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.