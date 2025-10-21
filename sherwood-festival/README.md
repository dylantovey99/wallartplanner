# Sherwood Community Festival Website

A modern, attractive website for the Sherwood Community Festival in Brisbane, Australia. This website showcases the festival's community spirit, entertainment offerings, stallholder opportunities, and volunteer programs.

## About the Festival

The Sherwood Community Festival is a not-for-profit, member-based Incorporated Association run entirely by volunteers. The festival celebrates local culture, creativity, and community connection at the beautiful Sherwood Arboretum in Brisbane.

## Website Features

### Modern Design
- **Responsive Layout**: Fully responsive design that works seamlessly on desktop, tablet, and mobile devices
- **Gradient Hero Section**: Eye-catching hero section with animated elements
- **Smooth Animations**: CSS animations and scroll-based transitions for engaging user experience
- **Modern Typography**: Professional font combinations using Google Fonts (Poppins & Playfair Display)
- **Color Gradients**: Beautiful gradient color schemes throughout the site

### Pages Included
1. **Home (index.html)**: Main landing page with festival overview, highlights, schedule, and volunteer information
2. **About (about.html)**: Detailed information about the festival's history, values, and community focus
3. **Entertainment (entertainment.html)**: Information about the four stages and various entertainment offerings
4. **Stalls (stalls.html)**: Comprehensive guide for potential stallholders including requirements and application info
5. **Contact (contact.html)**: Contact form, contact information, FAQ section, and location details

### Interactive Features
- Mobile-responsive navigation menu
- Smooth scrolling to page sections
- Contact form with validation
- Scroll-based animations
- Parallax effects
- Active navigation highlighting

## Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables, flexbox, and grid
- **Vanilla JavaScript**: No dependencies, pure JavaScript for all interactions
- **Google Fonts**: Poppins and Playfair Display font families

## File Structure

```
sherwood-festival/
├── index.html              # Home page
├── about.html              # About page
├── entertainment.html      # Entertainment page
├── stalls.html            # Stallholder information page
├── contact.html           # Contact page
├── css/
│   └── styles.css         # Main stylesheet
├── js/
│   └── script.js          # JavaScript functionality
├── images/                # Image assets (placeholder directory)
└── README.md              # This file
```

## Setup Instructions

### Local Development

1. **Clone or download the files**
   ```bash
   # If you have Git installed
   git clone [your-repository-url]
   cd sherwood-festival
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser
   - No build process or server required!
   - For the best experience, use a modern browser (Chrome, Firefox, Safari, or Edge)

3. **Optional: Use a local server**
   If you want to test with a local server:
   ```bash
   # Python 3
   python -m http.server 8000

   # Python 2
   python -m SimpleHTTPServer 8000

   # Node.js (if you have npx installed)
   npx serve
   ```
   Then visit `http://localhost:8000`

### Deployment Options

#### GitHub Pages
1. Create a GitHub repository
2. Push your code to the repository
3. Go to Settings > Pages
4. Select the branch to deploy (usually `main`)
5. Your site will be live at `https://[username].github.io/[repository-name]`

#### Netlify
1. Create a Netlify account
2. Drag and drop the `sherwood-festival` folder onto Netlify
3. Your site will be live instantly with a custom URL

#### Vercel
1. Create a Vercel account
2. Import your GitHub repository or upload the folder
3. Deploy with one click

## Customization Guide

### Updating Colors
Colors are defined as CSS variables in `css/styles.css`. Look for the `:root` section:

```css
:root {
    --primary-color: #FF6B6B;
    --secondary-color: #4ECDC4;
    --accent-color: #FFE66D;
    /* ... more colors */
}
```

### Adding Images
1. Place images in the `images/` directory
2. Update the relevant HTML files to reference your images
3. Recommended: Optimize images before uploading (compress, resize appropriately)

### Modifying Content
- All content is in standard HTML files
- Update text directly in the HTML files
- Maintain the existing structure for best styling results

### Updating Contact Information
Edit the contact details in the footer section of each HTML file and in `contact.html`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lightweight: No heavy frameworks or libraries
- Fast loading: Minimal external dependencies
- Optimized: CSS and JavaScript are optimized for performance
- Web fonts loaded asynchronously

## Accessibility

- Semantic HTML5 markup
- ARIA labels where appropriate
- Keyboard navigation support
- Responsive design for all screen sizes
- High contrast ratios for text readability

## Future Enhancements

Potential additions for future versions:
- Event countdown timer (JavaScript included, just needs activation)
- Photo gallery from past festivals
- Interactive map integration
- Newsletter signup integration
- Online stallholder application form
- Social media feed integration
- Event calendar

## Credits

**Website Design & Development**: Created for the Sherwood Community Festival

**Festival Information**: Based on official Sherwood Community Festival details
- Website: https://www.sherwoodfestival.com.au
- Facebook: https://www.facebook.com/sherwoodcommunityfestival/
- Email: secretary@sherwoodfestival.com.au

## License

This website is created for the Sherwood Community Festival. Please contact the festival organizers for usage rights and permissions.

## Support

For questions about the website, please contact:
- Email: secretary@sherwoodfestival.com.au
- Phone: 0450 096 999

## Updates

**Version 1.0** - Initial release
- Complete responsive website
- 5 pages with full content
- Interactive features
- Modern design

---

Built with ❤️ for the Sherwood Community
