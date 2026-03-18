# Task: Centralize API calls in admin-web

1. [ ] Identify all frontend files making direct API calls (axios/fetch).
2. [ ] Identify all hardcoded URLs (localhost, http://...).
3. [ ] Create a centralized API client (`src/api/client.js` or similar) with correct base URL configuration.
4. [ ] Create modular API services (e.g., `src/api/auth.js`, `src/api/students.js`) to encapsulate endpoints.
5. [ ] Refactor all identified files to use the new centralized API service.
6. [ ] Verify that the application still works correctly.
