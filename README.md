# Wall Art Planner

> **Beta Software**: This is a beta product. Please cross-verify all results with staff prior to placing real orders.

An interactive web application for planning, designing, and pricing wall art layouts. Create custom frame arrangements, calculate pricing, and visualize your wall art before ordering.

## Features

- **Interactive Canvas**: Drag-and-drop frames on a scalable wall canvas
- **Collision Detection**: Automatic spacing and collision avoidance
- **Frame Customization**: Configure print size, mat width, frame material and width
- **Price Calculator**: Automatic pricing based on dimensions and materials
- **Frame Suggestions**: Get complementary frame size recommendations
- **Background Upload**: Upload wall photos to visualize frames in context
- **Screenshot Export**: Save your layouts as images
- **State Persistence**: Automatically save and restore your work
- **Multiple Calculators**: Standalone frame and print size calculators

## Quick Start

### For Users

1. Open `index.html` in a modern web browser
2. Configure your wall dimensions
3. Add frame collections with desired specifications
4. Drag frames to arrange them on the wall
5. Use the screenshot button to save your layout

### For Developers

#### Prerequisites

- Node.js 18+
- Modern web browser with ES6 module support

#### Installation

```bash
# Clone the repository
git clone [repository-url]
cd wallartplanner

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Build for Production

```bash
npm run build
```

## Project Structure

```
wallartplanner/
├── index.html              # Main planner interface
├── frame-calculator.html   # Frame size calculator
├── print-calculator.html   # Print size calculator
├── order-form.html         # Order form page
├── styles.css              # Global styles
├── js/
│   ├── main.js                # Application entry point
│   ├── WallArtPlanner.js      # Main planner controller
│   ├── Frame.js               # Frame class
│   ├── Collection.js          # Frame collection management
│   ├── FrameDragManager.js    # Drag and drop handling
│   ├── PriceCalculator.js     # Pricing logic
│   ├── SuggestionEngine.js    # Frame suggestions
│   ├── DeletionManager.js     # Frame deletion
│   ├── BoundaryTester.js      # Boundary testing utility
│   ├── StateManager.js        # State persistence
│   └── utils.js               # Utility functions
└── functions.php           # WordPress/WooCommerce integration
```

## Usage Guide

### Adding Frames

1. **Set Wall Dimensions**: Enter your wall width and height in inches
2. **Configure Frame**:
   - Print size (width × height in inches)
   - Mat width (in centimeters)
   - Frame width (20mm, 30mm, or 40mm)
   - Frame material (Black, White, Oak, Walnut)
   - Number of frames
3. **Click "Add Collection"**: Frames will be added to the canvas

### Arranging Frames

- **Drag**: Click and drag frames to move them
- **Spacing**: Frames automatically maintain minimum spacing
- **Grid Snap**: Frames snap to grid for alignment (configurable)
- **Delete**: Click the × button on any frame to remove it

### Frame Suggestions

1. Add some frames to your layout
2. Open the "Frame Suggestions" section
3. Choose dimension to match (width or height)
4. Select orientation and aspect ratio
5. Click "Get Suggestion" to see recommended frame size
6. Click "Apply Suggestion" to add it to the form

### Calculating Prices

1. Add your frame collections
2. Open "Price this Collection" section
3. Click "Calculate Collection Price"
4. View detailed breakdown by collection and frame

### Taking Screenshots

1. Use "Hide icons" to hide frame controls
2. Use "Hide all" to hide all overlays
3. Click "Screenshot Layout" to download an image

## Configuration Options

### Wall Settings

- **Width**: 24-600 inches
- **Height**: 24-600 inches
- **Grid Size**: 0.25", 0.5", 1", or 2" (controls snap precision)
- **Frame Spacing**: 0.25"-6" (minimum distance between frames)

### Frame Options

- **Print Sizes**: Custom dimensions in inches
- **Mat Width**: 0-20cm
- **Frame Widths**: 20mm (0.79"), 30mm (1.18"), 40mm (1.57")
- **Materials**: Black, White, Oak, Walnut

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions (iOS Safari included)

**Note**: Requires ES6 module support. Not compatible with Internet Explorer.

## Development

### Available Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm test            # Run unit tests
npm run lint        # Check code quality
npm run format      # Format code
```

### Code Style

This project uses:
- ESLint for linting
- Prettier for formatting
- ES6 modules
- Vanilla JavaScript (no frameworks)

### Adding Features

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Add tests
4. Run linting: `npm run lint`
5. Commit changes: `git commit -m "Add your feature"`
6. Push and create pull request

## WordPress Integration

The `functions.php` file provides WordPress/WooCommerce integration:

- Session management
- Custom product layouts
- Image upload handling
- Cart integration

**Important**: Review and implement security recommendations from `AUDIT_REPORT.md` before using in production.

## Known Issues

See `AUDIT_REPORT.md` for comprehensive list of:
- Security vulnerabilities
- Code quality issues
- Performance improvements
- Accessibility concerns

## Roadmap

### Version 1.1 (Next Release)
- [ ] Fix critical security issues
- [ ] Add comprehensive tests
- [ ] Improve accessibility
- [ ] Better error handling

### Version 2.0 (Future)
- [ ] Migrate to TypeScript
- [ ] Add user accounts
- [ ] Cloud save/sync
- [ ] Mobile app

## Contributing

Contributions are welcome! Please:

1. Read the audit report (`AUDIT_REPORT.md`)
2. Follow the code style guidelines
3. Add tests for new features
4. Update documentation

## Security

**Important**: This application has known security vulnerabilities. See `AUDIT_REPORT.md` for details. Do not use in production without addressing critical security issues.

To report security issues: [Add contact information]

## License

[Add appropriate license]

## Credits

- Built with vanilla JavaScript
- Uses html2canvas for screenshot functionality
- AWS SDK for image handling

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: [Add contact information]

---

**Warning**: Beta software. Verify all calculations and prices before placing orders.
