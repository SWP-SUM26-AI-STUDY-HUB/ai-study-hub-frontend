
  # AI-Powered Study Document System

**AI-Powered Study Document System** is a smart platform for managing and sharing academic documents, integrated with a built-in AI Assistant to help students, learners, and educators optimize their self-study and research processes. The project features a professional UI design, smooth animations, and intuitive interactive elements.

---

## Key Features

The system is designed with clear roles and permissions for 3 distinct user groups:

### 1. Guests
* **Guest Homepage**: User-friendly search interface featuring popular and recently uploaded documents.
* **Search & Filters**: Search for documents by keyword, subject (academic major), or tags.
* **Document Preview**: View public documents in a dedicated preview interface with an optimized reading layout.

### 2. Users (Authenticated Members)
* **User Authentication**: Sign up, sign in, forgot/reset password, and email verification. Includes Google Sign-In support (Mocked).
* **Personal Document Management**:
  * Upload new documents (supports drag-and-drop, description, major selection, and tags).
  * Edit document metadata or toggle visibility (Public / Private).
  * Manage uploaded documents and bookmarked (favorite) files.
* **💬 Side-by-Side AI Chat Assistant**:
  * Chat with the AI directly next to the document reader.
  * Ask the AI to summarize, explain difficult terms, generate quiz questions, translate content, etc.
  * Keep track of conversation history in the Chat History page.
* **Storage & Upgrades**: Monitor personal storage consumption using visual charts and simulate a premium storage capacity upgrade.
* **Profile Management**: Update profile details such as name, academic major, and avatar.

### 3. Administrators
* **Admin Dashboard**: Track system metrics (total users, total documents, upload activity) using clean, interactive analytics charts.
* **Document Moderation**: Review, approve, or reject pending document submissions to maintain content quality.
* **User Management**: Monitor the user database, issue warnings, or ban accounts violating platform guidelines.
* **Report Management**: Review and resolve user-submitted complaints regarding copyright issues or inappropriate content.

---

## Tech Stack

Built on a modern frontend architecture:

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Core Framework** | React (v18), Vite (v6) | High-performance Single Page Application (SPA) development |
| **Routing** | React Router (v7) | Declarative client-side routing & Route Guards (Protected/Admin routes) |
| **Styling & UI** | Tailwind CSS (v4), Bootstrap 5 (React-Bootstrap) | Responsive layout design, responsive components, and flexible utilities |
| **UI Components** | Radix UI, Material UI (MUI) | Premium accessibility-focused and customizable UI primitives |
| **Animations** | Framer Motion (`motion`) | Fluid page transitions and micro-interactions |
| **Charts** | Recharts | Interactive storage metrics and admin analytics charts |
| **Notifications** | Sonner | Clean and interactive toast notifications |
| **State Management**| React Context API (`AppContext`) | Global application state (authentication, admin mode toggle) |

---

## Installation & Local Setup

Follow these steps to run the project on your local machine:

### 1. Prerequisites
* Install **Node.js** (Version 18 or above recommended).

### 2. Install Dependencies
Open a terminal in the root directory of the project and run:
```bash
npm install
# Or if you use pnpm:
pnpm install
```

### 3. Start the Development Server
Once the installation is complete, start the application with:
```bash
npm run dev
# Or:
pnpm dev
```
Open your browser and navigate to: `http://localhost:5173`

---

## Test Credentials

The system includes simulated local state and mock authentication credentials for ease of testing:

> [!TIP]
> * **Standard User**: Enter **any email and password** at the login page (or click **Google**) to access the standard User interface.
> * **System Administrator**:
>   * Email: `admin@studydocs.ai`
>   * Password: *Any password*

---

## Project Directory Structure

```text
AI-Powered Study Document System/
```
<img width="1495" height="1021" alt="z7890559731168_233c4dbf4a8ca1a86b8b58492907e05d" src="https://github.com/user-attachments/assets/5060a28a-7cb5-4be5-89c8-8cacca6a405c" />

