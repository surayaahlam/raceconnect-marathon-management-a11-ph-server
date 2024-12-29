# RaceConnect - Server Side  

This repository contains the backend implementation for the **RaceConnect - Marathon Management System**. The server handles user authentication, data management, and API endpoints for the platform.  

## **Features**  

- **User Authentication**:  
  - Email/password-based authentication using **Firebase**.  
  - Secure user sessions with **JWT (JSON Web Tokens)** for protected routes.  

- **CRUD Operations**:  
  - Create, read, update, and delete marathon registrations and campaigns.  
  - Ensure only authorized users can modify their data.  

- **Sorting and Filtering**:  
  - Sort marathons by `createdAt` (e.g., Newest First or Oldest First).  
  - Filter marathon registrations based on query parameters like title or email.  

- **Secure Data Handling**:  
  - All API routes are protected using JWT verification to ensure secure access.  
  - Unauthorized requests are met with proper HTTP status codes (`401` and `403`).  

## **Technologies Used**  

- **Node.js**: Backend runtime for building scalable applications.  
- **Express.js**: Lightweight and flexible web framework for creating API endpoints.  
- **MongoDB**: NoSQL database for efficient data storage and retrieval.  
- **Firebase**: Used for authentication and user management.  
- **JWT**: For secure user authentication and protected routes.  
- **dotenv**: Manages environment variables securely.  
- **cookie-parser**: For handling cookies, especially JWTs.  
- **cors**: Allows cross-origin requests between frontend and backend.  

## **API Endpoints**  

### **Authentication**  
- **`POST /jwt`**: Authenticate user and return JWT token.  
- **`GET /logout`**: Clear the user’s JWT token (logout).  

### **Marathons**  
- **`GET /marathons`**: Fetch all marathons for authenticated users.  
- **`GET /marathonSection`**: Fetch 6 random marathons.  
- **`GET /upcomingMarathons`**: Fetch upcoming marathons based on current date.  
- **`GET /marathon/:id`**: Fetch marathon details by ID.  
- **`GET /marathons/:email`**: Fetch marathons by user email with sorting functionality.  
- **`POST /addMarathon`**: Add a new marathon.  
- **`PUT /updateMarathon/:id`**: Update marathon by ID.  
- **`PATCH /marathon/:id/increment`**: Increment registration count for a marathon.  
- **`DELETE /marathon/:id`**: Delete a marathon by ID.  

### **Registrations**  
- **`GET /myApplyList/:email`**: Fetch marathon registrations by user email with optional search query.  
- **`POST /registrations`**: Register for a marathon.  
- **`PUT /myApplyList/:id`**: Update registration details.  
- **`DELETE /myApplyList/:id`**: Delete a registration by ID.  

