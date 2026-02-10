# AI Coding Instructions for Booking System Phase 1

## Project Overview
**Booking System Phase 1** is a privacy-first resource booking application with a containerized frontend. The project uses Tailwind CSS for styling and role-based UI rendering (admin vs. reserver views).

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/JavaScript with Tailwind CSS (CDN-based)
- **Styling**: Tailwind with custom brand color palette (primary red `#e10e49`, dark `#1e1e1e`, green `#284e36`, blue `#263f6a`, orange `#e37222`, rose `#c24d52`)
- **Deployment**: Docker with nginx Alpine serving static files
- **Project Stage**: Phase 1 (MVP/prototype) - backend integration is planned

### Key Files & Structure
- `Dockerfile`: Nginx Alpine container that serves `/app` folder as static content on port 80
- `app/index.html`: Landing/home page with hero section and development banner
- `app/resources.html`: Resource management UI (create, update, delete operations)
- `app/resources.js`: Role-based UI logic that conditionally renders admin/reserver actions

### Data Flow & Integration Points
- **Frontend-only Phase**: Currently static HTML/JS; backend integration via form submission is planned
- **resources.js role-switching**: Demonstrates the intended pattern - toggle `const role = "admin"|"reserver"` to preview different UI states
- **Backend expectation**: Form in `resources.html` will POST data to a backend service (not yet implemented)

## Development Workflows

### Building & Deployment
```bash
# Build Docker image
docker build -t booking-system .

# Run container
docker run -p 80:8080 booking-system
```

### Local Development
- No build step required; edit HTML/JS directly in `/app` folder
- Serve locally with any static server: `python -m http.server 8000` from `/app` directory
- All styling is Tailwind CDN-based (no build required)

### File Organization Pattern
- All static assets (HTML, JS, SVG, CSS) live in `/app`
- No src/dist build pipeline; **modifications are immediately reflected**
- Logo referenced as `logo.svg` in image tags but file not present - **add if implementing visual branding**

## Code Patterns & Conventions

### Brand Color Usage
All brand colors are defined in Tailwind config within HTML `<script>` tags:
```javascript
colors: {
  brand: {
    primary: "#e10e49",    // Main action buttons
    light: "#ffffff",       // Backgrounds
    dark: "#1e1e1e",        // Headers, text
    blue: "#263f6a",        // Badges, secondary
    green: "#284e36",       // Success, overview
    orange: "#e37222",      // Development banner
    rose: "#c24d52",        // Delete/destructive actions
  }
}
```
Use these semantic color names (not hex values) in Tailwind classes: `bg-brand-primary`, `text-brand-dark`, etc.

### Role-Based UI Rendering
The `resources.js` pattern demonstrates conditional UI based user role:
```javascript
const role = "admin"; // Toggle between "admin" and "reserver"
if (role === "admin") {
  // Render Create, Update, Delete buttons
}
```
**Expected pattern**: Extend this to all feature-gated functionality; move role determination to backend-provided data later.

### Tailwind Conventions
- Use Tailwind utility classes exclusively (no custom CSS)
- Common responsive breakpoints: `lg:` for large screens, `sm:` for small
- Consistent spacing: `px-6`, `py-4` for standard padding
- Shadow utility: `shadow-soft` (custom defined) for depth

### Layout Patterns
- Max-width containers: `max-w-7xl` with centering via `mx-auto`
- Page structure: sticky header → main content → (optional footer)
- Hero sections use `grid` with responsive column spans: `lg:grid-cols-12`

## Integration Patterns

### Backend Readiness
- `resources.html` includes a helper chip: "Changes are saved via backend later"
- Form structure is ready for backend POST; action and method attributes will be added during backend integration
- No form validation or error handling yet - implement when backend is available

### Development vs. Production
- Development banner (orange) is shown by default on `index.html`
- Include feature flags or environment checks when backend is integrated
- Static paths (`/`, `/login`, `/register`) are navigation placeholders - backend routing will override these

## Common Modification Patterns

### Adding New Pages
1. Create new `.html` file in `/app`
2. Import Tailwind config (copy from `index.html` or `resources.html`)
3. Use brand colors and spacing conventions above
4. Link in header nav when ready

### Updating Styling
- **Never** add custom CSS files; extend Tailwind config in `<script>` if needed
- Test Tailwind classes in browser DevTools before committing
- Keep all brand color references consistent (use semantic names)

### Role-Based Feature Gates
- Mirror the `resources.js` pattern for conditional rendering
- Always document the role in a comment: `const role = "admin"; // TODO: From backend`
- Plan for real role data from backend during Phase 2

## Known Limitations & TODOs
- `logo.svg` referenced but not present in `/app` - add placeholder or implement branding
- No JavaScript form validation (add when backend is ready)
- Navigation links (`/login`, `/register`) are static placeholders
- No responsive images or lazy loading yet
- Accessibility (alt text, ARIA) needs review
