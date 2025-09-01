# Portfolio Section Visibility Configuration

This portfolio includes a powerful configuration system to control which sections are displayed on your website.

## Configuration Location

Edit the `settings` object in `src/config/portfolio.ts`:

```typescript
settings: {
  showContact: true,          // Show/hide contact section
  showAbout: true,           // Show/hide about section
  showProjects: true,        // Show/hide projects section
  showExperience: true,      // Show/hide experience section
  showSkills: true,          // Show/hide skills section
  showServices: true,        // Show/hide services section
  showTestimonials: false,   // Show/hide testimonials section
  showCertificates: false,   // Show/hide certificates section
},
```

## How to Use

### Hide Contact Section
```typescript
settings: {
  showContact: false,  // Contact section will be hidden
  // ... other settings
}
```

### Hide Multiple Sections
```typescript
settings: {
  showContact: false,        // Hide contact
  showTestimonials: false,   // Hide testimonials
  showCertificates: false,   // Hide certificates
  // ... other settings
}
```

## Features

✅ **Dynamic Navigation**: Navigation menu automatically updates to exclude hidden sections
✅ **Clean URLs**: No broken links to hidden sections
✅ **Performance**: Hidden sections are not rendered at all
✅ **Easy Toggle**: Simple true/false configuration
✅ **Hot Reload**: Changes take effect immediately in development

## Example Use Cases

- **Portfolio in Progress**: Hide sections you haven't completed yet
- **Client Presentation**: Show only relevant sections for specific audiences
- **Minimal Portfolio**: Keep only essential sections for a clean look
- **A/B Testing**: Test different combinations of sections

## Deployment

After making changes:

```bash
npm run build:deploy
```

Your changes will be automatically deployed to the server with the new section visibility!
