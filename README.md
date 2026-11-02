# Azoni.ai - Portfolio Website

Personal portfolio website for Charlton Smith, featuring an AI-powered chatbot, project showcase, and more.

## Features

- **AI Chatbot (Azoni-GPT)** - GPT-4 powered assistant trained on my background and projects
- **Project Showcase** - Filterable gallery of projects with detailed pages
- **Responsive Design** - Mobile-first, dark theme
- **Fast & Modern** - React 19, no unnecessary dependencies

## Tech Stack

- React 19
- React Router 7
- OpenAI API (GPT-4)
- CSS Custom Properties (no frameworks)
- Deployed on Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for chatbot)

### Installation

```bash
# Clone the repository
git clone https://github.com/azoni-ai/azoni-website.git
cd azoni-website

# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env

# Start development server
npm start
```

### Environment Variables

Secrets (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `FIREBASE_*`, `RAG_ADMIN_KEY` and the rest in `.env.example`) are read only by the Netlify Functions. Never put a secret in a `REACT_APP_*` variable: Create React App copies those into the public JavaScript. `npm run build` (`scripts/build.cjs`) leaves out any `REACT_APP_*` name that isn't on the public list in `scripts/check-bundle-secrets.cjs`, and fails if a key-shaped string or a non-public name still shows up in the bundle.

## Project Structure

```
src/
  components/       # Reusable UI components
    Layout.jsx      # Page wrapper with Navbar/Footer
    Navbar.jsx      # Navigation
    Footer.jsx      # Footer
    ProjectCard.jsx # Project card component
  pages/            # Page components
    Home.jsx        # Landing page
    About.jsx       # About me, skills, experience
    Projects.jsx    # Project listing
    ProjectDetail.jsx # Individual project page
    Chat.jsx        # AI chatbot
    Resume.jsx      # Resume viewer
    Play.jsx        # Game (WIP)
  data/             # Static data
    projects.js     # Project information
    profile.js      # Personal info, skills, experience
  styles/           # CSS
    index.css       # Global styles
```

## Deployment

The site is configured for Netlify deployment:

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add the server-side environment variables from `.env.example` (no secrets under `REACT_APP_*`)

The `_redirects` file handles client-side routing.

## Customization

### Adding Projects

Edit `src/data/projects.js` to add new projects:

```javascript
{
  id: "project-slug",
  title: "Project Title",
  tagline: "Short tagline",
  description: "Brief description for cards",
  longDescription: "Detailed description for project page",
  tech: ["React", "Python", "etc"],
  highlights: ["Feature 1", "Feature 2"],
  links: {
    live: "https://...",
    github: "https://..."
  },
  featured: true,  // Show on homepage
  category: "ai"   // ai, fintech, web3, games
}
```

### Updating Profile

Edit `src/data/profile.js` to update personal information, skills, and experience.

## License

MIT

## Contact

- Email: charlton@azoni.ai
- LinkedIn: [/in/charltonsmith](https://linkedin.com/in/charltonsmith)
- GitHub: [@azoni](https://github.com/azoni)
