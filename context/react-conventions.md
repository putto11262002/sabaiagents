# React Conventions and Project Structure

This document outlines the conventions for working with React, React Router, and Tailwind CSS in this Bun-based fullstack application.

## Folder Structure

```
src/
├── index.ts                    # Bun server entry point
├── public/                     # Public HTML files
│   └── index.html             # Main HTML entry with React root
├── frontend/                   # All frontend React code
│   ├── app.tsx                # Root React component with Router setup
│   ├── routes/                # Route/page components
│   │   ├── layout.tsx         # Shared layout wrapper with Outlet
│   │   ├── home.tsx           # Home page component
│   │   └── about.tsx          # About page component
│   ├── components/            # Reusable React components
│   │   └── navbar.tsx         # Example: Navigation component
│   └── styles/                # CSS/styling files
│       └── app.css            # Tailwind imports and custom styles
└── context/                   # Project documentation
    └── react-conventions.md   # This file
```

## React Router Setup (Declarative Mode)

This project uses **React Router in declarative mode** with the following pattern:

### Main App Setup (`src/frontend/app.tsx`)

```tsx
import { BrowserRouter, Routes, Route } from "react-router";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

### Key Concepts

1. **BrowserRouter**: Wraps the entire app to enable routing
2. **Routes**: Container for all route definitions
3. **Route**: Defines individual routes with `path` and `element` props
4. **Nested Routes**: Child routes render inside parent's `<Outlet />`
5. **Index Route**: Default child route when at parent path

### Layout Pattern

**Layout Component** (`src/frontend/routes/layout.tsx`):
- Contains shared UI (navbar, footer, etc.)
- Uses `<Outlet />` to render child routes
- All routes that share this layout are nested under it

```tsx
import { Outlet } from "react-router";

export default function Layout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  );
}
```

## File Naming Conventions

- **Routes/Pages**: `lowercase.tsx` (e.g., `home.tsx`, `about.tsx`, `user-profile.tsx`)
- **Components**: `lowercase.tsx` (e.g., `navbar.tsx`, `user-card.tsx`)
- **App Root**: `app.tsx` (main React entry point)
- **Styles**: `lowercase.css` (e.g., `app.css`)

## Component Conventions

### Page Components (in `src/frontend/routes/`)

- Export default function with PascalCase name
- Represent full pages/views
- Example:

```tsx
export default function Home() {
  return <div>Home Page</div>;
}
```

### Reusable Components (in `src/frontend/components/`)

- Export default function with PascalCase name
- Should be generic and reusable
- Example:

```tsx
export default function Navbar() {
  return <nav>...</nav>;
}
```

## Tailwind CSS Usage

### Setup

1. **Config**: `tailwind.config.ts` at project root
2. **Import**: Add Tailwind directives in `src/frontend/styles/app.css`
3. **Content Paths**: Configure to scan all frontend files

```ts
// tailwind.config.ts
export default {
  content: [
    './src/public/**/*.html',
    './src/frontend/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
};
```

### In Components

Use Tailwind utility classes directly:

```tsx
<div className="bg-blue-600 text-white p-4 rounded-lg">
  <h1 className="text-2xl font-bold">Hello</h1>
</div>
```

## Bun Server Integration

### HTML Imports

The server imports HTML files directly:

```ts
import indexHtml from "./public/index.html";

Bun.serve({
  routes: {
    "/": indexHtml,
  },
});
```

### HTML File Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="../frontend/styles/app.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../frontend/app.tsx"></script>
  </body>
</html>
```

- **CSS Link**: Points to Tailwind CSS file (Bun bundles it)
- **Script**: Points to React app entry (Bun transpiles & bundles)
- **Root Div**: Where React mounts the app

## Adding New Routes

To add a new route:

1. **Create route component** in `src/frontend/routes/`:

```tsx
// src/frontend/routes/products.tsx
export default function Products() {
  return <div>Products Page</div>;
}
```

2. **Add route to app.tsx**:

```tsx
import Products from "./routes/products";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="products" element={<Products />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

3. **Add navigation link** (if needed):

```tsx
<Link to="/products">Products</Link>
```

## Dynamic Routes

For routes with parameters:

```tsx
// In app.tsx
<Route path="users/:id" element={<UserProfile />} />

// In component
import { useParams } from "react-router";

export default function UserProfile() {
  const { id } = useParams();
  return <div>User {id}</div>;
}
```

## Navigation

Use React Router's `Link` component for internal navigation:

```tsx
import { Link } from "react-router";

<Link to="/about">About</Link>
```

## Development Workflow

### Running the Dev Server

```bash
bun --hot src/index.ts
```

- Bun serves the app with HMR enabled
- Changes to React/CSS auto-reload
- Server runs on `http://localhost:3000`

### Type Checking

```bash
bun run typecheck
```

### Testing

```bash
bun test
```

## Best Practices

1. **Separation of Concerns**:
   - Server code in `src/index.ts`
   - React code in `src/frontend/`
   - Public assets in `src/public/`

2. **Component Organization**:
   - Routes = Pages that map to URLs
   - Components = Reusable UI pieces

3. **Styling**:
   - Prefer Tailwind utilities
   - Add custom CSS to `app.css` if needed
   - Use Tailwind's `@apply` for common patterns

4. **Routing**:
   - Keep routes organized in `app.tsx`
   - Use nested routes for shared layouts
   - Use layout components for common UI

5. **TypeScript**:
   - All files use `.tsx` for React components
   - Type safety throughout

## API Routes

Add API endpoints in `src/index.ts`:

```ts
Bun.serve({
  routes: {
    "/": indexHtml,
    "/api/users/:id": {
      GET: (req) => {
        return Response.json({ id: req.params.id });
      },
    },
  },
});
```

Access from React using `fetch`:

```tsx
const response = await fetch('/api/users/123');
const data = await response.json();
```

## Summary

This setup provides:
- ✅ Modern Bun-based fullstack development
- ✅ React 19 with TypeScript
- ✅ React Router in declarative mode
- ✅ Tailwind CSS with Bun's bundler
- ✅ Hot Module Reload (HMR)
- ✅ Clean folder structure and conventions
- ✅ Type safety throughout
