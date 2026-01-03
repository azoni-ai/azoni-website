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

# Set up environment variables
cp .env.example .env
# Edit .env and add your OpenAI API key

# Start development server
npm start
```

### Environment Variables

```
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** The current implementation calls OpenAI directly from the frontend. For production, you should proxy this through a backend to protect your API key.

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
4. Add environment variable: `REACT_APP_OPENAI_API_KEY`

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

- Email: charltonuw@gmail.com
- LinkedIn: [/in/charltonsmith](https://linkedin.com/in/charltonsmith)
- GitHub: [@azoni](https://github.com/azoni)
